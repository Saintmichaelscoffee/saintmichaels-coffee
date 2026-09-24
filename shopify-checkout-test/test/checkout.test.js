import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../api/index.js';

const base = 'https://preview.example.com/api';
const env = { TEST_ACCESS_KEY: 'a-private-test-access-key-123456', SHOPIFY_STORE_DOMAIN: 'b95as8-ck.myshopify.com', SHOPIFY_VARIANT_ID: 'gid://shopify/ProductVariant/47275834572972', SHOPIFY_CLIENT_ID: 'test-client', SHOPIFY_CLIENT_SECRET: 'test-secret' };
const auth = 'Basic ' + Buffer.from('tester:' + env.TEST_ACCESS_KEY).toString('base64');

test('access control, origin check, cart attribute, and checkout host', async () => {
 const denied = await handle(new Request(base), env);
 assert.equal(denied.status, 401);
 const page = await handle(new Request(base, { headers: { Authorization: auth } }), env);
 assert.equal(page.status, 200);
 assert.match(await page.text(), /No affiliate applications or commissions/);
 const request = (origin = 'https://preview.example.com') => new Request(base, { method: 'POST', headers: { Authorization: auth, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'ref=test123' });
 assert.equal((await handle(request('https://evil.example.com'), env)).status, 403);
 let calls = 0;
 const fetcher = async (url, options) => {
  calls++;
  if (url.endsWith('/admin/oauth/access_token')) return { ok: true, json: async () => ({ access_token: 'admin-token', expires_in: 86400, scope: 'read_orders,unauthenticated_read_product_listings,unauthenticated_read_checkouts,unauthenticated_write_checkouts' }) };
  if (url.includes('/admin/api/')) return { ok: true, json: async () => ({ data: { delegateAccessTokenCreate: { delegateAccessToken: { accessToken: 'private-token', expiresIn: 86400 }, userErrors: [] } } }) };
  assert.equal(options.headers['Shopify-Storefront-Private-Token'], 'private-token');
  const variables = JSON.parse(options.body).variables;
  assert.deepEqual(variables.input.attributes, [{ key: 'sm_affiliate_code', value: 'TEST123' }]);
  assert.equal(variables.input.lines[0].merchandiseId, env.SHOPIFY_VARIANT_ID);
  return { ok: true, json: async () => ({ data: { cartCreate: { cart: { checkoutUrl: 'https://b95as8-ck.myshopify.com/checkouts/test' }, userErrors: [] } } }) };
 };
 const result = await handle(request(), env, fetcher);
 assert.equal(result.status, 200);
 assert.match(await result.text(), /href="https:\/\/b95as8-ck\.myshopify\.com\/checkouts\/test"/);
 assert.equal(calls, 3);
});
