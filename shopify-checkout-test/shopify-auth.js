// Server-only Shopify authentication for a Dev Dashboard app in the same organization as its store.
let cached;
let pending;

export async function storefrontPrivateToken({domain,clientId,clientSecret,fetcher=fetch,now=Date.now}) {
 if(cached?.domain===domain && cached.clientId===clientId && cached.expires>now()+60000)return cached.token;
 if(pending)return pending;
 pending=(async()=>{
  const auth=await fetcher(`https://${domain}/admin/oauth/access_token`,{
   method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({grant_type:'client_credentials',client_id:clientId,client_secret:clientSecret}).toString()
  });
  if(!auth.ok){
   let code='unknown';
   try {
    const body=await auth.text();
    code=['shop_not_permitted','app_not_installed','invalid_client','invalid_request','unauthorized_client','invalid_grant'].find(value=>body.includes(value))||'unknown';
   } catch {}
   throw Error(`Shopify app authentication failed (${auth.status}, ${code})`);
  }
  const data=await auth.json();
  if(!data.access_token || !Number.isFinite(data.expires_in))throw Error('Shopify returned invalid app credentials');
  const needed=['unauthenticated_read_product_listings','unauthenticated_read_checkouts','unauthenticated_write_checkouts'];
  // Give the checkout subsystem only Storefront scopes, not read_orders.
  const delegated=await fetcher(`https://${domain}/admin/api/2026-07/graphql.json`,{
   method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':data.access_token},
   body:JSON.stringify({query:'mutation($scopes: [String!]!) { delegateAccessTokenCreate(input: { delegateAccessScope: $scopes }) { delegateAccessToken { accessToken expiresIn } userErrors { message } } }',variables:{scopes:needed}})
  });
  if(!delegated.ok)throw Error('Shopify Storefront delegation failed');
  const result=await delegated.json(),value=result.data?.delegateAccessTokenCreate;
  if(result.errors?.length || value?.userErrors?.length || !value?.delegateAccessToken?.accessToken)throw Error('Shopify rejected Storefront delegation');
  const ttl=Math.min(data.expires_in,value.delegateAccessToken.expiresIn||data.expires_in);
  cached={domain,clientId,token:value.delegateAccessToken.accessToken,expires:now()+ttl*1000};
  return cached.token;
 })();
 try{return await pending;}finally{pending=undefined;}
}
