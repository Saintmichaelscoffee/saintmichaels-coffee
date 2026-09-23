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
 function entrance(){
  const verse=document.querySelector('.hero-scripture');if(!verse||reduce.matches||paused||!verse.animate||scrollY>150)return;
  verseAnimation?.cancel();const b=verse.getBoundingClientRect(),r=hero.getBoundingClientRect(),large=desktop.matches;
  const x=large?innerWidth/2-b.left-b.width/2:0,y=large?r.top+Math.min(r.height,innerHeight-r.top)*.4-b.top:0,scale=large?1.65:1;
  verseAnimation=verse.animate([{opacity:0,transform:`translate(${x}px,${y}px) scale(${scale})`,offset:0},{opacity:1,transform:`translate(${x}px,${y}px) scale(${scale})`,offset:.25},{opacity:1,transform:'none',offset:1}],{duration:large?2200:650,easing:'cubic-bezier(.22,.61,.36,1)'});
 }
 configure();(document.fonts?.ready||Promise.resolve()).then(entrance);addEventListener('pageshow',e=>{if(e.persisted){configure();entrance()}});
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
