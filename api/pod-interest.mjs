import {
  MAX_BODY_BYTES, ERROR_STATUS, errorEnvelope, validatePayload, validateBridgeReply,
} from '../lib/protocol.mjs';
import { POLL_CONFIG } from '../lib/server-config.mjs';

const MAX_REPLY_BYTES = 4096;
const UPSTREAM_TIMEOUT_MS = 12000;
const BODY_TIMEOUT_MS = 3000;
const PROXY_PER_MINUTE = 60;
const CONTENT_TYPE_RE = /^application\/json(?:\s*;\s*charset=utf-8)?$/i;

function previewOrigin(hostname) {
  // Platform-owned runtime variables only; no Origin/Host/header-derived allowlist.
  // Project/team naming is pinned to verified deployment names, not *.vercel.app.
  if (typeof hostname !== 'string' || hostname.length > 253
      || !/^saint-michaels-coffee-[a-z0-9-]+-saintmichaelscoffee\.vercel\.app$/.test(hostname)
      || hostname.split('.').some(label => label.length > 63 || label.startsWith('-') || label.endsWith('-'))) return null;
  return 'https://' + hostname;
}
export function readConfig(env, serverConfig = POLL_CONFIG) {
  try {
    const upstream = new URL(env.POLL_APPS_SCRIPT_URL || serverConfig.appsScriptUrl);
    if (upstream.protocol !== 'https:' || upstream.hostname !== 'script.google.com'
        || upstream.port || upstream.username || upstream.password || upstream.search || upstream.hash
        || !/^\/macros\/s\/[A-Za-z0-9_-]{20,}\/exec$/.test(upstream.pathname)) return null;
    const origins = env.POLL_ALLOWED_ORIGINS
      ? env.POLL_ALLOWED_ORIGINS.split(',').map(value => value.trim())
      : [...serverConfig.allowedOrigins];
    if (env.VERCEL === '1' && env.VERCEL_ENV === 'preview') {
      for (const name of ['VERCEL_URL', 'VERCEL_BRANCH_URL']) {
        const origin = previewOrigin(env[name]);
        if (origin) origins.push(origin);
      }
    }
    if (!origins.length || origins.some(value => {
      const origin = new URL(value);
      return origin.protocol !== 'https:' || origin.origin !== value
        || origin.username || origin.password;
    })) return null;
    return { upstream: upstream.href, origins: new Set(origins) };
  } catch { return null; }
}
function jsonResponse(value, status = 200, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  };
  if (value.retryAfterSeconds > 0) headers['Retry-After'] = String(value.retryAfterSeconds);
  return new Response(JSON.stringify(value), { status, headers });
}
function fail(code, retryAfterSeconds = 0, headers = {}) {
  return jsonResponse(errorEnvelope(code, retryAfterSeconds), ERROR_STATUS[code] || 503, headers);
}
function fault(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}
export async function readCapped(body, cap, signal, sizeCode) {
  if (!body) throw fault('INVALID_REQUEST');
  const reader = body.getReader();
  const chunks = [];
  let size = 0;
  let abort;
  const aborted = new Promise((_, reject) => {
    abort = () => reject(fault('DEADLINE'));
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), aborted]);
      if (done) break;
      size += value.byteLength;
      if (size > cap) throw fault(sizeCode);
      chunks.push(value);
    }
    const joined = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder('utf-8', { fatal: true }).decode(joined);
  } finally {
    signal.removeEventListener('abort', abort);
    // Do not wait for remote cancellation to acknowledge.
    void reader.cancel().catch(() => {});
  }
}
function allowedContentRedirect(location, current) {
  try {
    const url = new URL(location, current);
    // Google documents this exact host for ContentService's one-time output URL.
    // Never forward the POST body or credentials when following it.
    if (url.protocol !== 'https:' || url.hostname !== 'script.googleusercontent.com'
        || url.port || url.username || url.password || url.hash
        || url.pathname !== '/macros/echo') return null;
    return url.href;
  } catch { return null; }
}
export async function forwardSubmission(payload, config, { fetchImpl, timeoutMs = UPSTREAM_TIMEOUT_MS }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let url = config.upstream;
    let method = 'POST';
    let response;
    for (let hop = 0; hop <= 2; hop += 1) {
      response = await fetchImpl(url, {
        method,
        headers: method === 'POST'
          ? { 'Content-Type': 'application/json; charset=utf-8', Accept: 'application/json' }
          : { Accept: 'application/json' },
        ...(method === 'POST' ? { body: JSON.stringify(payload) } : {}),
        redirect: 'manual', credentials: 'omit', cache: 'no-store', signal: controller.signal,
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const next = [302, 303].includes(response.status)
          ? allowedContentRedirect(response.headers.get('location'), url) : null;
        void response.body?.cancel().catch(() => {});
        if (!next || hop === 2) throw fault('UPSTREAM_INVALID');
        url = next;
        method = 'GET'; // NEVER replay the mutating POST through a redirect.
        continue;
      }
      if (response.status !== 200 || !CONTENT_TYPE_RE.test(response.headers.get('content-type') || '')) {
        void response.body?.cancel().catch(() => {});
        throw fault('UPSTREAM_INVALID');
      }
      const raw = await readCapped(response.body, MAX_REPLY_BYTES, controller.signal, 'UPSTREAM_INVALID');
      let reply;
      try { reply = JSON.parse(raw); } catch { throw fault('UPSTREAM_INVALID'); }
      if (!validateBridgeReply(reply, payload.submissionId)) throw fault('UPSTREAM_INVALID');
      return reply;
    }
    throw fault('UPSTREAM_INVALID');
  } catch (error) {
    if (controller.signal.aborted) throw fault('UPSTREAM_TIMEOUT');
    if (error.code === 'UPSTREAM_INVALID') throw error;
    throw fault('UPSTREAM_UNAVAILABLE');
  } finally { clearTimeout(timer); }
}
export function createHandler({
  env = process.env, serverConfig = POLL_CONFIG, fetchImpl = globalThis.fetch, now = Date.now,
  upstreamTimeoutMs = UPSTREAM_TIMEOUT_MS, bodyTimeoutMs = BODY_TIMEOUT_MS,
} = {}) {
  // A best-effort per-instance guard. The Apps Script durable caps are authoritative.
  let bucket = -1;
  let count = 0;
  return async function handle(request) {
    if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 0, { Allow: 'POST' });
    const config = readConfig(env, serverConfig);
    if (!config) return fail('NOT_CONFIGURED');
    const url = new URL(request.url);
    const origin = request.headers.get('origin');
    if (!origin || !config.origins.has(origin) || origin !== url.origin
        || (request.headers.has('sec-fetch-site') && request.headers.get('sec-fetch-site') !== 'same-origin')) {
      return fail('ORIGIN_NOT_ALLOWED');
    }
    if (url.pathname !== '/api/pod-interest' || url.search) return fail('INVALID_REQUEST');
    if (!CONTENT_TYPE_RE.test(request.headers.get('content-type') || '')
        || request.headers.has('content-encoding')) return fail('UNSUPPORTED_MEDIA_TYPE');
    const declared = request.headers.get('content-length');
    if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)) {
      return fail('PAYLOAD_TOO_LARGE');
    }
    const time = now();
    const minute = Math.floor(time / 60000);
    if (minute !== bucket) { bucket = minute; count = 0; }
    if (count >= PROXY_PER_MINUTE) {
      return fail('RATE_LIMITED', Math.max(1, Math.ceil(((minute + 1) * 60000 - time) / 1000)));
    }
    count += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), bodyTimeoutMs);
    let payload;
    try {
      const raw = await readCapped(request.body, MAX_BODY_BYTES, controller.signal, 'PAYLOAD_TOO_LARGE');
      payload = JSON.parse(raw);
    } catch (error) {
      return fail(error.code === 'PAYLOAD_TOO_LARGE' ? 'PAYLOAD_TOO_LARGE' : 'INVALID_REQUEST');
    } finally { clearTimeout(timer); }
    const validation = validatePayload(payload, now());
    if (validation) return fail(validation);
    try {
      const reply = await forwardSubmission(payload, config, { fetchImpl, timeoutMs: upstreamTimeoutMs });
      return jsonResponse(reply, reply.ok ? 200 : ERROR_STATUS[reply.code]);
    } catch (error) {
      // No automated POST retry. Any upstream failure may follow an actual save.
      return fail(error.code || 'UPSTREAM_UNAVAILABLE');
    }
  };
}

// Vercel Web Standard handler, supported by its Node runtime; requires no dependencies.
export default { fetch: createHandler() };
