// Google Analytics: shared across every public website page.
(()=>{
 const id='G-9R0V4XMNSH';
 if(document.querySelector('script[src*="googletagmanager.com/gtag/js"]'))return;
 window.dataLayer=window.dataLayer||[];
 window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
 window.gtag('js',new Date());
 window.gtag('config',id,{allow_google_signals:false,allow_ad_personalization_signals:false});
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


