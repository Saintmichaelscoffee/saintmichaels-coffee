// This contract is deliberately duplicated in standalone Code.gs. Parity is tested.
export const INTERESTS = Object.freeze([
  'Yes, I’d buy a 12-pack',
  'Maybe, depending on price',
  'I prefer bagged coffee',
]);
export const QUANTITIES = Object.freeze(['', '1', '2', '3', '4+', 'Not sure']);
export const MAX_BODY_BYTES = 2048;
export const MIN_INTERACTION_MS = 1500;
export const MAX_REQUEST_AGE_MS = 24 * 60 * 60 * 1000;
export const ID_RE = /^[0-9]{13}\.[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const ERROR_STATUS = Object.freeze({
  INVALID_REQUEST: 400, PAYLOAD_TOO_LARGE: 413, UNSUPPORTED_MEDIA_TYPE: 415,
  METHOD_NOT_ALLOWED: 405, ORIGIN_NOT_ALLOWED: 403, NOT_CONFIGURED: 503,
  TOO_FAST: 400, EXPIRED_ID: 409, RATE_LIMITED: 429, BUSY: 503,
  IDEMPOTENCY_CONFLICT: 409, OUTCOME_UNKNOWN: 503, STORAGE_UNAVAILABLE: 503,
  CAPACITY_REACHED: 503, FORM_UNAVAILABLE: 503, FORM_SCHEMA_MISMATCH: 503,
  UPSTREAM_INVALID: 502, UPSTREAM_TIMEOUT: 504, UPSTREAM_UNAVAILABLE: 502,
});
export const BRIDGE_ERROR_CODES = Object.freeze([
  'INVALID_REQUEST', 'PAYLOAD_TOO_LARGE', 'UNSUPPORTED_MEDIA_TYPE',
  'METHOD_NOT_ALLOWED', 'TOO_FAST', 'EXPIRED_ID', 'RATE_LIMITED', 'BUSY',
  'IDEMPOTENCY_CONFLICT', 'OUTCOME_UNKNOWN', 'STORAGE_UNAVAILABLE',
  'CAPACITY_REACHED', 'FORM_UNAVAILABLE', 'FORM_SCHEMA_MISMATCH',
]);
export function exactKeys(object, keys) {
  return object !== null && typeof object === 'object' && !Array.isArray(object)
    && Object.keys(object).length === keys.length
    && keys.every(key => Object.hasOwn(object, key));
}
export function validatePayload(input, now = Date.now()) {
  if (!exactKeys(input, ['submissionId', 'startedAt', 'interest', 'quantity', 'website'])
      || typeof input.submissionId !== 'string' || !ID_RE.test(input.submissionId)
      || !Number.isSafeInteger(input.startedAt)
      || Number(input.submissionId.slice(0, 13)) !== input.startedAt
      || !INTERESTS.includes(input.interest) || !QUANTITIES.includes(input.quantity)
      || input.website !== '') return 'INVALID_REQUEST';
  if (now - input.startedAt < MIN_INTERACTION_MS) return 'TOO_FAST';
  if (now - input.startedAt > MAX_REQUEST_AGE_MS) return 'EXPIRED_ID';
  return null;
}
export function errorEnvelope(code, retryAfterSeconds = 0) {
  return { ok: false, code, retryAfterSeconds };
}
export function validReceipt(receipt) {
  return exactKeys(receipt, ['id', 'savedAt'])
    && typeof receipt.id === 'string' && /^[0-9a-f]{64}$/.test(receipt.id)
    && typeof receipt.savedAt === 'string'
    && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(receipt.savedAt)
    && Number.isFinite(Date.parse(receipt.savedAt))
    && new Date(receipt.savedAt).toISOString() === receipt.savedAt;
}
export function validateBridgeReply(reply, submissionId) {
  if (reply?.ok === true) {
    return exactKeys(reply, ['ok', 'status', 'submissionId', 'receipt', 'duplicate'])
      && reply.status === 'saved' && reply.submissionId === submissionId
      && typeof reply.duplicate === 'boolean' && validReceipt(reply.receipt);
  }
  return exactKeys(reply, ['ok', 'code', 'retryAfterSeconds'])
    && reply.ok === false && BRIDGE_ERROR_CODES.includes(reply.code)
    && Number.isInteger(reply.retryAfterSeconds)
    && reply.retryAfterSeconds >= 0 && reply.retryAfterSeconds <= 86400;
}
