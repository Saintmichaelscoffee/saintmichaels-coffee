(() => {
 const root=document.documentElement, reduce=matchMedia('(prefers-reduced-motion: reduce)'), desktop=matchMedia('(min-width:1024px) and (hover:hover)');
 const toggle=document.querySelector('.motion-toggle'), hero=document.querySelector('.hero');
 let paused=false, observer, frame=0, verseAnimation;
 // Motion repeats on visits; an explicit pause remains respected in this tab.
 try{paused=sessionStorage.getItem('sm-motion-paused')==='true'}catch(_){}
 function paint(){frame=0;if(!root.classList.contains('motion-on')||!desktop.matches||document.hidden||!hero)return;const r=hero.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)hero.style.setProperty('--hero-drift',Math.min(42,Math.max(-25,-r.top*.055))+'px')}
 function schedule(){if(!frame)frame=requestAnimationFrame(paint)}
 function configure(){
  observer?.disconnect(); const enabled=!reduce.matches&&!paused;root.classList.toggle('motion-on',enabled);const fabric=hero?.querySelector('.flag-fabric');if(fabric){if(enabled&&hero.classList.contains('hero-visible'))fabric.unpauseAnimations();else fabric.pauseAnimations()}
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
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});document.addEventListener('visibilitychange',()=>{const fabric=hero?.querySelector('.flag-fabric');if(fabric){if(document.hidden||paused||reduce.matches||!hero.classList.contains('hero-visible'))fabric.pauseAnimations();else fabric.unpauseAnimations()}schedule()});reduce.addEventListener('change',configure);desktop.addEventListener('change',configure);
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
 if(hero&&'IntersectionObserver' in window)new IntersectionObserver(entries=>entries.forEach(e=>{hero.classList.toggle('hero-visible',e.isIntersecting);const fabric=hero.querySelector('.flag-fabric');if(fabric){if(e.isIntersecting&&!paused&&!reduce.matches)fabric.unpauseAnimations();else fabric.pauseAnimations()}})).observe(hero);
 addEventListener('pageshow',e=>{if(e.persisted){configure();if(hero?.getBoundingClientRect().bottom>0)entrance()}});
 // Move the existing CTA controls without duplicating links or focus targets.
 const heroCopy=document.querySelector('.hero-copy'),showcase=document.querySelector('.hero-showcase'),heroCtas=heroCopy?.querySelector('.row'),phoneLayout=matchMedia('(max-width:850px)');
 function placeHeroCtas(){if(!heroCtas||!showcase||!heroCopy)return;(phoneLayout.matches?showcase:heroCopy).append(heroCtas)}
 placeHeroCtas();phoneLayout.addEventListener('change',placeHeroCtas);
 const gallery=document.querySelector('.mission-gallery');
 if(gallery){
  const tabs=[...gallery.querySelectorAll('[role=tab]')],slides=[...gallery.querySelectorAll('.mission-slide')],counter=gallery.querySelector('.gallery-count'),stage=gallery.querySelector('.gallery-stage'),rotation=gallery.querySelector('.gallery-rotation');
  const interval=4000;
  let current=0,timer=0,inView=false,userPaused=false,hovered=matchMedia('(hover:hover)').matches&&gallery.matches(':hover'),focused=gallery.contains(document.activeElement),pageActive=true,touch;
  function select(i,focus=false){current=(i+slides.length)%slides.length;slides.forEach((s,n)=>s.hidden=n!==current);tabs.forEach((t,n)=>{t.setAttribute('aria-selected',String(n===current));t.tabIndex=n===current?0:-1});counter.textContent=`${current+1} of ${slides.length}`;if(focus)tabs[current].focus()}
  function canRotate(){return rotation&&slides.length>1&&!userPaused&&!paused&&!reduce.matches&&!document.hidden&&pageActive&&inView&&!hovered&&!focused&&!touch&&!gallery.contains(document.activeElement)}
  function syncRotation(){
   clearTimeout(timer);timer=0;
   // Automatic changes stay quiet; manual navigation keeps the original count announcement.
   counter.setAttribute('aria-live',userPaused?'polite':'off');
   if(rotation){
    const blocked=reduce.matches||paused;
    rotation.disabled=blocked;
    rotation.textContent=blocked?'Rotation paused':userPaused?'Play rotation':'Pause rotation';
    rotation.setAttribute('aria-label',blocked?(reduce.matches?'Automatic story rotation is disabled by reduced motion':'Automatic story rotation is disabled while site motion is paused'):(userPaused?'Play automatic story rotation':'Pause automatic story rotation'));
    rotation.title=blocked?(reduce.matches?'Reduced motion is enabled.':'Enable site motion to play automatic stories.'):'Rotation pauses while you hover or focus this section.';
   }
   gallery.setAttribute('data-rotation-state',reduce.matches||paused?'motion-disabled':userPaused?'paused':canRotate()?'playing':'waiting');
   if(canRotate())timer=setTimeout(()=>{timer=0;if(!canRotate())return;select(current+1);syncRotation()},interval);
  }
  function manualSelect(i,focus=false){userPaused=true;syncRotation();select(i,focus)}
  gallery.classList.add('gallery-ready');gallery.querySelector('.gallery-tabs').hidden=false;gallery.querySelector('.gallery-controls').hidden=false;select(0);
  tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>manualSelect(i));tab.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=current+1;else if(e.key==='ArrowLeft')n=current-1;else if(e.key==='Home')n=0;else if(e.key==='End')n=slides.length-1;else return;e.preventDefault();manualSelect(n,true)})});
  gallery.querySelector('.gallery-prev').addEventListener('click',()=>manualSelect(current-1));gallery.querySelector('.gallery-next').addEventListener('click',()=>manualSelect(current+1));
  rotation?.addEventListener('click',()=>{userPaused=!userPaused;syncRotation()});
  gallery.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'){hovered=true;syncRotation()}});
  gallery.addEventListener('pointerleave',()=>{hovered=false;syncRotation()});
  gallery.addEventListener('focusin',()=>{focused=true;syncRotation()});
  gallery.addEventListener('focusout',e=>{focused=gallery.contains(e.relatedTarget);queueMicrotask(syncRotation)});
  stage.addEventListener('touchstart',e=>{const t=e.changedTouches[0];touch={x:t.clientX,y:t.clientY};syncRotation()},{passive:true});
  stage.addEventListener('touchend',e=>{if(!touch)return;const t=e.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;touch=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)manualSelect(current+(dx<0?1:-1));else syncRotation()},{passive:true});
  stage.addEventListener('touchcancel',()=>{touch=null;syncRotation()},{passive:true});
  // Start only once the story itself is visible, and restart with a full reading interval.
  if('IntersectionObserver' in window){
   new IntersectionObserver(entries=>{entries.forEach(entry=>{inView=entry.isIntersecting&&entry.intersectionRatio>=.25});syncRotation()},{threshold:.25}).observe(stage);
  }else{
   const checkVisibility=()=>{const r=stage.getBoundingClientRect(),width=Math.max(0,Math.min(r.right,innerWidth)-Math.max(r.left,0)),height=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0));inView=r.width>0&&r.height>0&&width*height/(r.width*r.height)>=.25;syncRotation()};
   addEventListener('scroll',checkVisibility,{passive:true});addEventListener('resize',checkVisibility,{passive:true});checkVisibility();
  }
  document.addEventListener('visibilitychange',syncRotation);
  reduce.addEventListener('change',syncRotation);
  // The existing global handler updates `paused` before this listener runs.
  toggle?.addEventListener('click',syncRotation);
  addEventListener('pagehide',()=>{pageActive=false;syncRotation()});
  addEventListener('pageshow',()=>{pageActive=true;syncRotation()});
  syncRotation();
 }
})();
