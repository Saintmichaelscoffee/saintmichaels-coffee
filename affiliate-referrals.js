/* Review candidate: consent adapter required. No endpoint is called by default. */
(()=>{
'use strict';
const config=window.SMCReferralConfig||{},shop='g1gzkr-fe.myshopify.com',key='smc_ref';
const origins=['https://saintmichaelscoffee.com','https://www.saintmichaelscoffee.com','https://g1gzkr-fe.myshopify.com'];
const valid=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,40}$/.test(value)?value:null;
const consent=()=>{try{return navigator.globalPrivacyControl!==true&&window.SMCReferralConsent?.get()===true;}catch{return false;}};
const basis=()=>consent()?(window.SMCReferralConsent?.basis?.()||'affiliate-v1'):null;
const origin=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&origins.includes(u.origin)?u.origin+'/':'';}catch{return '';}};
let pending=valid(new URLSearchParams(location.search).get('ref')),memory=null,reported=false,controller;
const decorated=new Map();
function clear(){
 memory=null;try{localStorage.removeItem(key);}catch{}
 for(const domain of ['',location.hostname,'.saintmichaelscoffee.com'])document.cookie=key+'=; Max-Age=0; path=/; SameSite=Lax; Secure'+(domain?'; domain='+domain:'');
 for(const [a,href] of decorated)a.href=href;decorated.clear();controller?.abort();
}
function save(ref,days){
 if(!consent())return;
 const until=Date.now()+days*864e5;memory={ref,until};
 try{localStorage.setItem(key,JSON.stringify(memory));}catch{}
 document.cookie=key+'='+encodeURIComponent(ref)+'; Max-Age='+days*86400+'; path=/; SameSite=Lax; Secure'+(location.hostname.endsWith('saintmichaelscoffee.com')?'; domain=.saintmichaelscoffee.com':'');
}
function getRef(){
 if(!consent()){clear();return null;}
 let saved=memory;try{saved=saved||JSON.parse(localStorage.getItem(key)||'null');}catch{}
 if(!saved||!valid(saved.ref)||!Number.isFinite(saved.until)||saved.until<=Date.now()){clear();return null;}
 return saved.ref;
}
function reconcile(){
 if(!consent()){clear();if(window.SMCReferralConsent?.get()===false)pending=null;return;}
 if(pending){const ref=pending;pending=null;save(ref,30);report(ref);}else getRef();
}
function report(ref){
 // Activation requires an explicit verified endpoint in addition to consent.
 if(reported||!consent()||config.clickEndpoint!=='https://partners.saintmichaelscoffee.com/api/track/click')return;
 reported=true;controller=new AbortController();
 fetch(config.clickEndpoint,{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},signal:controller.signal,
 body:JSON.stringify({ref,...(basis()==='affiliate-us-optout-v1'?{policy:basis()}:{consent:'affiliate-v1'}),url:origin(location.href),referrer:origin(document.referrer)})})
 .then(response=>response.ok?response.json():null).then(data=>{if(data?.ok&&Number.isInteger(data.days)&&data.days>=1&&data.days<=365&&consent()&&getRef()===ref)save(ref,data.days);}).catch(()=>{});
}
function decorate(a){
 const ref=getRef();if(!ref)return;
 try{const u=new URL(a.href,location.href);if(u.origin!=='https://'+shop||u.username||u.password)return;
 if(!decorated.has(a))decorated.set(a,a.href);
 u.searchParams.set('ref',ref);if(/^\/cart\/\d/.test(u.pathname))u.searchParams.set('attributes[ref]',ref);a.href=u.href;
 }catch{}
}
for(const event of ['click','auxclick'])document.addEventListener(event,e=>{const a=e.target.closest?.('a[href]');if(a)decorate(a);},true);
document.addEventListener('formdata',event=>{
 const data=event.formData;data.delete('properties[_smc_ref]');data.delete('properties[_smc_ref_consent]');data.delete('properties[_smc_ref_policy]');
 const form=event.target;if(form.getAttribute('id')!=='subscription-selection')return;
 const action=new URL(form.action,location.href),ref=getRef();
 if(!ref||action.origin!=='https://'+shop||action.pathname!=='/cart/add')return;
 data.set('properties[_smc_ref]',ref);if(basis()==='affiliate-us-optout-v1')data.set('properties[_smc_ref_policy]',basis());else data.set('properties[_smc_ref_consent]','affiliate-v1');
});
window.SMCAffiliate={getRef,cartAttributes:()=>{const ref=getRef();return ref?[{key:'ref',value:ref}]:[];}};
window.SMCReferralConsent?.subscribe?.(reconcile);
addEventListener('pageshow',reconcile);addEventListener('storage',event=>{if(event.key==='smc_affiliate_choice'){if(!consent())pending=null;reconcile();}});
reconcile();
})();
