// Google metadata only: never rewrite shopping URLs, referral codes or linker values.
(()=>{
 const campaignKeys=new Set(['utm_source','utm_medium','utm_campaign','utm_id','utm_content','utm_term']);
 const clickKeys=new Set(['gclid','dclid','gbraid','wbraid']);
 const publicRoutes=new Set(['/','/about.html','/blog.html','/butter-in-coffee.html','/coffee-and-the-american-soldier.html','/coffee-and-the-night-watch.html','/coffee-before-the-bell.html','/foundation.html','/how-to-make-iced-coffee.html','/index.html','/install.html','/is-coffee-good-for-you.html','/mobile-terms.html','/offline.html','/privacy.html','/service-discount.html','/shop.html','/stand-watch.html','/support.html','/why-organic-coffee.html']);
 function cleanURL(value,{campaigns=false}={}){
  if(!value)return '';
  try{
   const url=new URL(value,location.href);
   if(!['http:','https:'].includes(url.protocol))return '';
   // Main-site routes are static HTML. External referrers need only their origin.
   const own=['saintmichaelscoffee.com','www.saintmichaelscoffee.com'].includes(url.hostname);
   const route=own&&publicRoutes.has(url.pathname)?url.pathname:'/';
   const safe=new URL(route,url.origin);
   if(campaigns)for(const [key,value] of url.searchParams){
    const valid=campaignKeys.has(key)?/^[a-z0-9_ .~-]{1,100}$/i.test(value):clickKeys.has(key)&&/^[a-z0-9_-]{1,256}$/i.test(value);
    if(valid&&!/[0-9][\d .-]{6,}[0-9]/.test(value))safe.searchParams.set(key,value);
   }
   return safe.href;
  }catch{return '';}
 }
 function context(){return {page_location:cleanURL(location.href,{campaigns:true}),page_referrer:cleanURL(document.referrer)};}
 window.SMCAnalyticsMetadata=Object.freeze({cleanURL,context});
})();

// Google Analytics: shared across every public website page.
(()=>{
 const id='G-9R0V4XMNSH';
 if(document.querySelector('script[src*="googletagmanager.com/gtag/js"]'))return;
 window.dataLayer=window.dataLayer||[];
 window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
 window.gtag('js',new Date());
 window.gtag('config',id,{allow_google_signals:false,allow_ad_personalization_signals:false,...window.SMCAnalyticsMetadata.context()});
 const tag=document.createElement('script');
 tag.async=true;
 tag.src='https://www.googletagmanager.com/gtag/js?id='+id;
 document.head.appendChild(tag);
})();

(()=>{
 const header=document.querySelector('header.bar'),button=header?.querySelector('.mobile-nav-toggle'),nav=header?.querySelector('nav.v');
 if(!header||!button||!nav)return;
 const mobile=matchMedia('(max-width:1000px)');
 function close(){header.classList.remove('nav-open');button.setAttribute('aria-expanded','false');}
 header.classList.add('nav-menu-ready');
 button.addEventListener('click',()=>{const open=!header.classList.contains('nav-open');header.classList.toggle('nav-open',open);button.setAttribute('aria-expanded',String(open));});
 nav.addEventListener('click',e=>{if(e.target.closest('a'))close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&header.classList.contains('nav-open')){close();button.focus();}});
 document.addEventListener('click',e=>{if(!header.contains(e.target))close();});
 mobile.addEventListener('change',close);
})();



// Conversion intent only; completed commerce events remain owned by Shopify.
(()=>{
function track(name,params={}){window.gtag?.('event',name,{...params,...window.SMCAnalyticsMetadata.context()});}
document.addEventListener('click',event=>{
 const card=event.target.closest('.subscription-card');if(card){track('subscription_card_click',{bag_quantity:Number(card.dataset.bags)});return;}
 const link=event.target.closest('a');if(!link)return;
 if(link.closest('.service-offer'))track('service_discount_banner_click');
 if(/pre.?order/i.test(link.textContent))track('preorder_click',{destination:new URL(window.SMCAnalyticsMetadata.cleanURL(link.href)||location.origin).pathname});
});
document.addEventListener('submit',event=>{const form=event.target;if(form.getAttribute('id')==='subscription-selection'&&!event.defaultPrevented&&form.elements.id.value)track(event.submitter?.dataset.purchase==='one-time'?'one_time_checkout_click':'subscription_checkout_click',{bag_quantity:Number(form.dataset.bags),selling_plan_id:form.elements.selling_plan.disabled?undefined:form.elements.selling_plan.value});});
document.addEventListener('smc:waitlist-accepted',()=>track('waitlist_submission'));
document.addEventListener('smc:service-accepted',()=>track('service_discount_registration'));
})();

// First-party referral preferences. Load the consent adapter before attribution.
(()=>{
 if(document.getElementById('smc-referral-assets'))return;
 const css=document.createElement('link');css.id='smc-referral-assets';css.rel='stylesheet';css.href='/affiliate-preferences.css';document.head.append(css);
 const preferences=document.createElement('script');preferences.src='/affiliate-preferences.js';
 preferences.onload=()=>{window.SMCReferralConfig={clickEndpoint:'https://partners.saintmichaelscoffee.com/api/track/click'};const sdk=document.createElement('script');sdk.src='/affiliate-referrals.js';document.body.append(sdk);};
 document.body.append(preferences);
})();
