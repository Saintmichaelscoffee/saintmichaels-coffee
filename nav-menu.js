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
