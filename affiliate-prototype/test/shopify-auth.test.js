import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storefrontPrivateToken } from '../shopify-auth.js';

test('exchanges installed app credentials, delegates only Storefront scopes, caches token and renews before expiry',async()=>{
 let clock=1000000,calls=[];
 const fetcher=async(url,options)=>{
  calls.push({url,options});
  if(url.endsWith('/admin/oauth/access_token')){
   assert.equal(options.headers['Content-Type'],'application/x-www-form-urlencoded');
   assert.equal(new URLSearchParams(options.body).get('grant_type'),'client_credentials');
   return {ok:true,json:async()=>({access_token:'admin-secret',expires_in:86399,scope:'read_orders,unauthenticated_read_product_listings,unauthenticated_read_checkouts,unauthenticated_write_checkouts'})};
  }
  assert.equal(options.headers['X-Shopify-Access-Token'],'admin-secret');
  assert.deepEqual(JSON.parse(options.body).variables.scopes,['unauthenticated_read_product_listings','unauthenticated_read_checkouts','unauthenticated_write_checkouts']);
  return {ok:true,json:async()=>({data:{delegateAccessTokenCreate:{delegateAccessToken:{accessToken:'private-storefront-token',expiresIn:120},userErrors:[]}}})};
 };
 const args={domain:'test.myshopify.com',clientId:'id',clientSecret:'secret',fetcher,now:()=>clock};
 assert.equal(await storefrontPrivateToken(args),'private-storefront-token');
 assert.equal(await storefrontPrivateToken(args),'private-storefront-token');
 assert.equal(calls.length,2);
 clock+=61000;
 assert.equal(await storefrontPrivateToken(args),'private-storefront-token');
 assert.equal(calls.length,4);
});
