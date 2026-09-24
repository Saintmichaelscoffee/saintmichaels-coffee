import { createHash, timingSafeEqual } from 'node:crypto';
import { storefrontPrivateToken } from '../shopify-auth.js';

const html = `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shopify checkout test</title><style>body{font:16px/1.5 system-ui;background:#101722;color:white;max-width:42rem;margin:5rem auto;padding:1rem}input,button{font:inherit;padding:.7rem}input{width:16rem}button{background:#235c96;color:white;border:0;cursor:pointer}</style><h1>Saint Michaels checkout test</h1><p>This creates one test cart for the configured product. Use a test referral code, then inspect the resulting Shopify order for the <code>sm_affiliate_code</code> attribute.</p><form method="post"><label>Test referral code <input name="ref" pattern="[A-Za-z0-9_-]{1,32}" required></label><button>Create test cart</button></form><p>No affiliate applications or commissions are recorded here.</p></html>`;

function response(message, status = 200, headers = {}) {
 return new Response(message, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
}

function validPassword(request, expected) {
 const header = request.headers.get('authorization') || '';
 let candidate = '';
 if (header.startsWith('Basic ')) {
  try { const [user, password] = Buffer.from(header.slice(6), 'base64').toString('utf8').split(':'); if (user === 'tester') candidate = password || ''; } catch {}
 }
 const a = createHash('sha256').update(candidate).digest();
 const b = createHash('sha256').update(expected).digest();
 return candidate.length > 0 && timingSafeEqual(a, b);
}

export async function handle(request, env = process.env, fetcher = fetch) {
 if (!env.TEST_ACCESS_KEY || env.TEST_ACCESS_KEY.length < 24) return response('Test access is not configured.', 503);
 if (!validPassword(request, env.TEST_ACCESS_KEY)) return response('Sign in as tester using the private test access key.', 401, { 'WWW-Authenticate': 'Basic realm="Shopify checkout test"' });
 if (request.method === 'GET') return response(html, 200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" });
 if (request.method !== 'POST') return response('Method not allowed.', 405);
 if (request.headers.get('origin') !== new URL(request.url).origin) return response('Invalid origin.', 403);
 const form = await request.formData();
 const code = String(form.get('ref') || '').toUpperCase();
 if (!/^[A-Z0-9_-]{1,32}$/.test(code)) return response('Invalid test code.', 400);
 const domain = env.SHOPIFY_STORE_DOMAIN || '', variant = env.SHOPIFY_VARIANT_ID || '';
 if (!/^[a-z0-9-]+\.myshopify\.com$/.test(domain) || !/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(variant) || !env.SHOPIFY_CLIENT_ID || !env.SHOPIFY_CLIENT_SECRET) return response('Shopify is not configured.', 503);
 try {
  const token = await storefrontPrivateToken({ domain, clientId: env.SHOPIFY_CLIENT_ID, clientSecret: env.SHOPIFY_CLIENT_SECRET, fetcher });
  const shopify = await fetcher(`https://${domain}/api/2026-07/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Shopify-Storefront-Private-Token': token }, body: JSON.stringify({ query: 'mutation CartCreate($input: CartInput) { cartCreate(input: $input) { cart { checkoutUrl } userErrors { field message } } }', variables: { input: { lines: [{ merchandiseId: variant, quantity: 1 }], attributes: [{ key: 'sm_affiliate_code', value: code }] } } }) });
  if (!shopify.ok) return response('Shopify cart request failed.', 502);
  const payload = await shopify.json();
  const cart = payload.data?.cartCreate;
  if (payload.errors?.length || cart?.userErrors?.length || !cart?.cart?.checkoutUrl) return response('Shopify could not create the cart.', 502);
  const checkout = new URL(cart.cart.checkoutUrl);
  const allowed = [domain, env.SHOPIFY_CHECKOUT_DOMAIN].filter(Boolean);
  if (checkout.protocol !== 'https:' || !allowed.includes(checkout.hostname)) return response('Unexpected checkout domain.', 502);
  return response(null, 303, { Location: checkout.href });
 } catch (error) {
  console.error('Checkout test failed', error);
  return response('Checkout test failed. Check server logs.', 502);
 }
}

export default function handler(request) { return handle(request); }
