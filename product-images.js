(function () {
  'use strict';

  var HALF_TURN_MS = 260;
  var BACK_HOLD_MS = 2000;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var motionToggle = document.querySelector('.motion-toggle');
  var views = [];
  var assets = new Map();
  var observer;

  function motionAllowed() {
    return !reduceMotion.matches && !document.hidden &&
      (!motionToggle || motionToggle.getAttribute('aria-pressed') !== 'true');
  }

  // Never replace the visible face with an unloaded or broken image.
  function preload(url) {
    if (assets.has(url)) return assets.get(url);
    var promise = new Promise(function (resolve) {
      var asset = new Image();
      var settled = false;
      function finish(ok) {
        if (settled) return;
        settled = true;
        asset.onload = asset.onerror = null;
        resolve(ok);
      }
      asset.decoding = 'async';
      asset.onload = function () {
        if (!asset.naturalWidth) return finish(false);
        if (asset.decode) asset.decode().then(function () { finish(true); }, function () { finish(false); });
        else finish(true);
      };
      asset.onerror = function () { finish(false); };
      asset.src = url;
    });
    assets.set(url, promise);
    promise.then(function (ok) {
      // A later deliberate button press may retry a temporary network failure.
      if (!ok && assets.get(url) === promise) assets.delete(url);
    });
    return promise;
  }

  document.querySelectorAll('.product-image-controls').forEach(function (group) {
    var buttons = Array.from(group.querySelectorAll('button[data-product-image]'));
    if (!buttons.length) return;
    var image = document.getElementById(buttons[0].getAttribute('aria-controls'));
    if (!image) return;
    buttons = buttons.filter(function (button) {
      return button.getAttribute('aria-controls') === image.id;
    });
    var front = buttons[0];
    var back = buttons[1];
    var selected = buttons.find(function (button) { return button.getAttribute('aria-pressed') === 'true'; }) || front;
    var version = 0;
    var animation;
    var holdTimer;
    var endHold;
    var manual = false;
    var preparing = false;
    var prepared = false;
    var done = false;
    var visible = false;
    var running = false;
    var canAnimate = !!(back && image.closest('#view-shop') && image.animate &&
      window.CSS && CSS.supports('rotate', 'y 90deg'));
    function mark(state) { image.setAttribute('data-auto-flip', state); }
    mark(canAnimate ? 'waiting' : 'unsupported');

    function show(button) {
      image.src = button.dataset.productImage;
      image.alt = button.dataset.imageAlt || '';
      selected = button;
      buttons.forEach(function (item) {
        item.setAttribute('aria-pressed', String(item === button));
      });
    }

    function cancel() {
      version += 1;
      if (animation) {
        animation.cancel();
        animation = null;
      }
      if (holdTimer !== undefined) {
        clearTimeout(holdTimer);
        holdTimer = undefined;
      }
      if (endHold) {
        endHold(false);
        endHold = null;
      }
      running = preparing = false;
      image.classList.remove('product-image-flipping');
    }

    function retire() {
      done = true;
      if (observer) observer.unobserve(image);
    }

    function current(ticket) {
      return ticket === version && !manual && motionAllowed();
    }

    async function phase(from, to, ticket) {
      if (!current(ticket)) return false;
      var turn = image.animate([
        { rotate: 'y ' + from + 'deg' },
        { rotate: 'y ' + to + 'deg' }
      ], {
        duration: HALF_TURN_MS,
        easing: to === 0 ? 'ease-out' : 'ease-in',
        fill: 'both'
      });
      animation = turn;
      try {
        await turn.finished;
      } catch (_) {
        return false;
      }
      if (!current(ticket) || animation !== turn) return false;
      return true;
    }

    async function turnTo(button, direction, ticket) {
      if (!await phase(0, direction * 90, ticket)) return false;
      // Swap only at the edge, then reveal the new face from the opposite edge.
      // Every visible angle stays between -90 and 90 degrees: labels never mirror.
      var outgoing = animation;
      show(button);
      var incoming = phase(direction * -90, 0, ticket);
      outgoing.cancel();
      if (!await incoming) return false;
      animation.cancel();
      animation = null;
      return true;
    }

    function hold() {
      return new Promise(function (resolve) {
        endHold = resolve;
        holdTimer = setTimeout(function () {
          holdTimer = undefined;
          endHold = null;
          resolve(true);
        }, BACK_HOLD_MS);
      });
    }

    async function start() {
      if (done || manual || !prepared || !visible || !motionAllowed()) return;
      retire();
      running = true;
      mark('turning-back');
      var ticket = version;
      image.classList.add('product-image-flipping');
      try {
        if (!await turnTo(back, 1, ticket)) return;
        mark('holding-back');
        if (!await hold() || !current(ticket)) return;
        mark('turning-front');
        await turnTo(front, -1, ticket);
      } catch (_) {
        // Unsupported animation implementations fail back to the original face.
        mark('animation-error');
        if (current(ticket)) show(front);
      } finally {
        if (ticket === version) {
          if (selected !== front) show(front);
          mark('done');
          cancel();
        }
      }
    }

    function prepare() {
      if (done || manual || preparing || !motionAllowed()) return;
      if (prepared) return start();
      preparing = true;
      mark('loading');
      var ticket = version;
      Promise.all([preload(front.dataset.productImage), preload(back.dataset.productImage)]).then(function (loaded) {
        if (ticket !== version) return;
        preparing = false;
        if (!loaded.every(Boolean)) { mark('image-error'); return retire(); }
        prepared = true;
        start();
      });
    }

    // Native button clicks include mouse, touch, Enter, Space and assistive tech.
    // Taking control also invalidates in-flight loads, so a late result cannot win.
    group.addEventListener('click', function (event) {
      var button = event.target.closest('button[data-product-image]');
      if (!button || buttons.indexOf(button) === -1 || !group.contains(button)) return;
      manual = true;
      mark('manual');
      retire();
      cancel();
      if (button === selected) return;
      var ticket = version;
      preload(button.dataset.productImage).then(function (ok) {
        if (ok && ticket === version) show(button);
      });
    });

    views.push({
      image: image,
      eligible: canAnimate,
      intersect: function (entry) {
        image.setAttribute('data-auto-flip-ratio', String(entry.intersectionRatio));
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        if (visible && canAnimate) prepare();
      },
      configure: function () {
        if (!canAnimate || !observer || done) {
          if (!motionAllowed() && running) {
            cancel();
            if (!manual) show(front);
          }
          return;
        }
        if (motionAllowed()) observer.observe(image);
        else {
          observer.unobserve(image);
          visible = false;
          cancel();
          if (!manual && selected !== front) show(front);
        }
      },
      leave: function () {
        if (running || preparing) {
          retire();
          cancel();
          if (!manual) show(front);
        }
      }
    });
  });

  if ('IntersectionObserver' in window) {
    var byImage = new Map(views.map(function (view) { return [view.image, view]; }));
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var view = byImage.get(entry.target);
        if (view) view.intersect(entry);
      });
    }, { threshold: [0, 0.5] });
  }

  function configure() { views.forEach(function (view) { view.configure(); }); }
  configure();
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', configure);
  else if (reduceMotion.addListener) reduceMotion.addListener(configure);
  if (motionToggle && 'MutationObserver' in window) {
    new MutationObserver(configure).observe(motionToggle, { attributes: true, attributeFilter: ['aria-pressed'] });
  }
  document.addEventListener('visibilitychange', configure);
  window.addEventListener('pagehide', function () { views.forEach(function (view) { view.leave(); }); });
})();
