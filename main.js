/* Lightweight progressive enhancement: no animation libraries, no video downloads. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 1024px) and (hover: hover)');
  const button = document.querySelector('.motion-toggle');
  let paused = false;
  try { paused = sessionStorage.getItem('sm-motion-paused') === 'true'; } catch (_) {}
  let observer;
  let frame = 0;
  let targets = [];
  const hero = document.querySelector('.hero');
  const chapters = [...document.querySelectorAll('.journey-chapter')];
  const layers = [...document.querySelectorAll('.journey-layer')];
  let active = -1;
  const stepLinks = [...document.querySelectorAll('[data-step-link]')];
  const nextCue = document.querySelector('.journey-next');
  const stepNames = ['Military', 'Police', 'First Responders', 'Families'];
  function paint() {
    frame = 0;
    if (!root.classList.contains('motion-on') || !desktop.matches || document.hidden) return;
    if (hero) {
      const r = hero.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) hero.style.setProperty('--hero-drift', Math.min(42, Math.max(-25, -r.top * .055)) + 'px');
    }
    if (chapters.length) {
      let closest = 0, distance = Infinity;
      chapters.forEach((chapter, i) => {
        const r = chapter.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - innerHeight / 2);
        if (d < distance) { closest = i; distance = d; }
      });
      if (active !== closest) {
        active = closest;
        stepLinks.forEach((link, i) => {
          if (i === active) link.setAttribute('aria-current', 'step');
          else link.removeAttribute('aria-current');
        });
        if (nextCue) nextCue.textContent = active < 3 ? `0${active + 1} / 04 · Next: ${stepNames[active + 1]} ↓` : '04 / 04 · Everyone belongs here';
        layers.forEach((layer, i) => layer.classList.toggle('is-active', i === active));
        chapters.forEach((chapter, i) => chapter.classList.toggle('is-current', i === active));
      }
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(paint); }
  function configure() {
    observer?.disconnect();
    targets.forEach(el => el.classList.add('is-revealed'));
    const enabled = !reduce.matches && !paused;
    root.classList.toggle('motion-on', enabled);
    if (button) {
      button.hidden = reduce.matches;
      button.textContent = paused ? 'Enable motion' : 'Pause motion';
      button.setAttribute('aria-pressed', String(paused));
    }
    if (enabled && 'IntersectionObserver' in window) {
      targets = [...document.querySelectorAll('.collection-intro, .product-preview, .service-grid figure, .split > div, .split > figure, .timeline > *, .post-card, .journey-close, .verse .wrap')];
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); }
        });
      }, { threshold: .08, rootMargin: '0px 0px -20px 0px' });
      targets.forEach((el, i) => {
        el.classList.add('reveal-item');
        el.style.setProperty('--reveal-delay', Math.min(i % 3 * 65, 130) + 'ms');
        // Never hide content already in view or reached by a deep link.
        if (el.getBoundingClientRect().top > innerHeight) el.classList.remove('is-revealed');
        else el.classList.add('is-revealed');
        observer.observe(el);
      });
    }
    if (!enabled && hero) hero.style.removeProperty('--hero-drift');
    schedule();
  }
  button?.addEventListener('click', () => {
    paused = !paused;
    try { sessionStorage.setItem('sm-motion-paused', String(paused)); } catch (_) {}
    configure();
  });
  document.addEventListener('focusin', event => event.target.closest('.reveal-item')?.classList.add('is-revealed'));
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  document.addEventListener('visibilitychange', schedule);
  reduce.addEventListener('change', configure);
  desktop.addEventListener('change', configure);
  configure();
  // Once per session; animate the actual verse into its final, accessible position.
  const verse = document.querySelector('.hero-scripture');
  let seen = false;
  try { seen = sessionStorage.getItem('sm-verse-seen') === 'true'; } catch (_) {}
  if (verse && !seen && !reduce.matches && !paused && verse.animate) {
    const begin = () => {
      if (reduce.matches || paused) return;
      const box = verse.getBoundingClientRect();
      const heroBox = hero.getBoundingClientRect();
      const scale = desktop.matches ? 1.65 : 1;
      const dx = desktop.matches ? Math.max(0, innerWidth / 2 - box.left - box.width / 2) : 0;
      const dy = desktop.matches ? heroBox.top + Math.min(heroBox.height, innerHeight - heroBox.top) * .48 - box.top : 0;
      const anim = verse.animate([
        { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(${scale})`, offset: 0 },
        { opacity: 1, transform: `translate(${dx}px, ${dy}px) scale(${scale})`, offset: .2 },
        { opacity: 1, transform: 'translate(0,0) scale(1)', offset: 1 }
      ], { duration: desktop.matches ? 2100 : 650, easing: 'cubic-bezier(.22,.61,.36,1)' });
      reduce.addEventListener('change', () => anim.cancel(), { once: true });
      button?.addEventListener('click', () => anim.cancel(), { once: true });
      try { sessionStorage.setItem('sm-verse-seen', 'true'); } catch (_) {}
    };
    (document.fonts?.ready || Promise.resolve()).then(begin);
  }
})();
