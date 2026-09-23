(() => {
 const root=document.documentElement, reduce=matchMedia('(prefers-reduced-motion: reduce)'), desktop=matchMedia('(min-width:1024px) and (hover:hover)');
 const toggle=document.querySelector('.motion-toggle'), hero=document.querySelector('.hero');
 let paused=false, observer, frame=0, verseAnimation;
 // Motion repeats on visits; an explicit pause remains respected in this tab.
 try{paused=sessionStorage.getItem('sm-motion-paused')==='true'}catch(_){}
 function paint(){frame=0;if(!root.classList.contains('motion-on')||!desktop.matches||document.hidden||!hero)return;const r=hero.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)hero.style.setProperty('--hero-drift',Math.min(42,Math.max(-25,-r.top*.055))+'px')}
 function schedule(){if(!frame)frame=requestAnimationFrame(paint)}
 function configure(){
  observer?.disconnect(); const enabled=!reduce.matches&&!paused;root.classList.toggle('motion-on',enabled);
  if(toggle){toggle.hidden=reduce.matches;toggle.textContent=paused?'Enable motion':'Pause motion';toggle.setAttribute('aria-pressed',String(paused))}
  if(!enabled){verseAnimation?.cancel();hero?.style.removeProperty('--hero-drift')}
  const targets=[...document.querySelectorAll('.collection-intro,.product-preview,.service-grid figure,.split>div,.split>figure,.timeline>*,.post-card,.gallery-heading,.verse .wrap')];
  targets.forEach(e=>{e.classList.add('reveal-item','is-revealed')});
  if(enabled&&'IntersectionObserver' in window){
   observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting)entry.target.classList.add('is-revealed');
    else if(!entry.target.contains(document.activeElement))entry.target.classList.remove('is-revealed');
   }),{threshold:0,rootMargin:'0px 0px 0px 0px'});
   targets.forEach((el,i)=>{el.style.setProperty('--reveal-delay',i%3*60+'ms');if(el.getBoundingClientRect().top>innerHeight)el.classList.remove('is-revealed');observer.observe(el)})
  }schedule();
 }
 toggle?.addEventListener('click',()=>{paused=!paused;try{sessionStorage.setItem('sm-motion-paused',String(paused))}catch(_){}configure()});
 document.addEventListener('focusin',e=>e.target.closest('.reveal-item')?.classList.add('is-revealed'));
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});document.addEventListener('visibilitychange',schedule);reduce.addEventListener('change',configure);desktop.addEventListener('change',configure);
 const verse=document.querySelector('.hero-scripture');
 function entrance(){
  if(!verse||reduce.matches||paused||!verse.animate)return;
  verseAnimation?.cancel();const b=verse.getBoundingClientRect();
  const large=desktop.matches, scale=large?1.12:1;
  const x=(innerWidth-b.width*scale)/2-b.left,y=Math.max(90,(innerHeight-b.height*scale)/2)-b.top;
  verseAnimation=verse.animate([
   {opacity:0,transform:`translate(${-b.right-40}px,${y}px) scale(${scale})`,backgroundColor:'rgba(6,9,15,.96)',offset:0},
   {opacity:1,transform:`translate(${x}px,${y}px) scale(${scale})`,backgroundColor:'rgba(6,9,15,.96)',offset:.3},
   {opacity:1,transform:`translate(${x}px,${y}px) scale(${scale})`,backgroundColor:'rgba(6,9,15,.96)',offset:.65},
   {opacity:1,transform:'none',backgroundColor:'rgba(6,9,15,0)',offset:1}
  ],{duration:4200,easing:'cubic-bezier(.22,.61,.36,1)'});
 }
 configure();
 (document.fonts?.ready||Promise.resolve()).then(()=>{
  if(verse&&'IntersectionObserver' in window){
   let visible=false;
   new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting&&!visible){visible=true;entrance()}else if(!e.isIntersecting){visible=false}}),{threshold:0}).observe(hero);
  }else entrance();
 });
 if(hero&&'IntersectionObserver' in window)new IntersectionObserver(entries=>entries.forEach(e=>hero.classList.toggle('hero-visible',e.isIntersecting))).observe(hero);
 addEventListener('pageshow',e=>{if(e.persisted){configure();if(hero?.getBoundingClientRect().bottom>0)entrance()}});
 const gallery=document.querySelector('.mission-gallery');
 if(gallery){
  const tabs=[...gallery.querySelectorAll('[role=tab]')],slides=[...gallery.querySelectorAll('.mission-slide')],counter=gallery.querySelector('.gallery-count'),stage=gallery.querySelector('.gallery-stage');let current=0;
  function select(i,focus=false){current=(i+slides.length)%slides.length;slides.forEach((s,n)=>s.hidden=n!==current);tabs.forEach((t,n)=>{t.setAttribute('aria-selected',String(n===current));t.tabIndex=n===current?0:-1});counter.textContent=`${current+1} of ${slides.length}`;if(focus)tabs[current].focus()}
  gallery.classList.add('gallery-ready');gallery.querySelector('.gallery-tabs').hidden=false;gallery.querySelector('.gallery-controls').hidden=false;select(0);
  tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>select(i));tab.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=current+1;else if(e.key==='ArrowLeft')n=current-1;else if(e.key==='Home')n=0;else if(e.key==='End')n=slides.length-1;else return;e.preventDefault();select(n,true)})});
  gallery.querySelector('.gallery-prev').addEventListener('click',()=>select(current-1));gallery.querySelector('.gallery-next').addEventListener('click',()=>select(current+1));
  let touch;stage.addEventListener('touchstart',e=>{const t=e.changedTouches[0];touch={x:t.clientX,y:t.clientY}},{passive:true});stage.addEventListener('touchend',e=>{if(!touch)return;const t=e.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)select(current+(dx<0?1:-1));touch=null},{passive:true});
 }
})();
