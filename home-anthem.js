'use strict';
(() => {
  // This file is loaded only by Home. Keep a path guard for routing mistakes.
  if (!['/', '/index.html'].includes(location.pathname)) return;
  const panel = document.getElementById('home-anthem');
  const audio = document.getElementById('home-anthem-audio');
  if (!panel || !audio || panel.dataset.initialized) return;
  panel.dataset.initialized = 'true';
  const toggle = document.getElementById('anthem-toggle');
  const mute = document.getElementById('anthem-mute');
  const stop = document.getElementById('anthem-stop');
  const status = document.getElementById('anthem-status');
  const key = 'smc-home-anthem-off';
  let optedOut = false;
  let suspended = false;
  let attempt = 0;
  try { optedOut = sessionStorage.getItem(key) === '1'; } catch {
    // Without visit storage, require Play so a prior off choice cannot be lost on navigation.
    optedOut = true;
  }
  function preference(off) {
    optedOut = off;
    try { if (off) sessionStorage.setItem(key, '1'); else sessionStorage.removeItem(key); } catch { /* Storage can be unavailable. */ }
  }
  function render(message) {
    toggle.textContent = audio.paused ? 'Play Anthem' : 'Pause Anthem';
    mute.textContent = audio.muted ? 'Unmute Anthem' : 'Mute Anthem';
    mute.setAttribute('aria-pressed', String(audio.muted));
    if (message) status.textContent = message;
  }
  function pause(message, remember = true, reset = false) {
    attempt++;
    if (remember) preference(true);
    audio.pause();
    if (reset && audio.readyState) audio.currentTime = 0;
    render(message);
  }
  async function play(explicit) {
    if (suspended || (!explicit && optedOut)) return;
    if (explicit) {
      preference(false);
      audio.muted = false;
      // A deliberate anthem request must not overlap other native media.
      document.querySelectorAll('video,audio').forEach(media => { if (media !== audio) media.pause(); });
    }
    const current = ++attempt;
    if (!audio.getAttribute('src')) audio.src = '/answer-the-call-song-final.mp3';
    try {
      await audio.play();
      if (suspended || current !== attempt) {
        if (suspended || optedOut) audio.pause();
        return;
      }
      render('Playing the anthem. Music plays on Home only.');
    } catch (error) {
      if (current !== attempt || suspended) return;
      render(error.name === 'NotAllowedError'
        ? 'Sound did not start. Press Play Anthem to listen.'
        : 'The anthem could not start. Press Play Anthem to try again.');
    }
  }
  toggle.addEventListener('click', () => {
    if (audio.paused) play(true);
    else pause('Anthem paused. It will stay off for this visit.');
  });
  stop.addEventListener('click', () => pause('Anthem stopped. It will stay off for this visit.', true, true));
  mute.addEventListener('click', () => {
    audio.muted = !audio.muted;
    if (audio.muted) preference(true);
    render(audio.muted ? 'Anthem muted. It will stay off when you return Home.' : (audio.paused ? 'Sound is on. Press Play Anthem to listen.' : 'Playing the anthem.'));
  });
  audio.addEventListener('play', () => {
    if (suspended) { audio.pause(); return; }
    if (audio.paused) return; // Ignore a queued play event after a stop or navigation.
    render(audio.muted ? 'Anthem muted.' : 'Playing the anthem. Music plays on Home only.');
  });
  audio.addEventListener('pause', () => {
    if (!audio.paused) return;
    if (!suspended && !audio.ended) preference(true);
    render(status.textContent.startsWith('Playing') ? 'Anthem paused. Press Play Anthem to listen again.' : undefined);
  });
  audio.addEventListener('ended', () => { preference(true); render('Anthem finished. Press Play Anthem to listen again.'); });
  audio.addEventListener('error', () => render('The anthem could not load. Press Play Anthem to try again.'));
  document.addEventListener('play', event => {
    if (event.target !== audio && event.target instanceof HTMLMediaElement) {
      pause('Anthem paused for other media. Press Play Anthem to listen again.');
    }
  }, true);
  // pagehide covers ordinary navigation and bfcache. Restoring Home never resumes sound.
  window.addEventListener('pagehide', () => { suspended = true; pause('Anthem paused. Press Play Anthem to listen again.', false); });
  window.addEventListener('pageshow', event => {
    suspended = false;
    if (event.persisted) pause('Anthem paused. Press Play Anthem to listen again.', false);
  });
  panel.hidden = false;
  render(optedOut ? 'Anthem is off for this visit. Press Play Anthem to listen.' : 'Press Play Anthem to listen.');
  if (!optedOut) play(false);
})();
