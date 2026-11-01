'use strict';
(() => {
  // This file is loaded only by Home. Keep a path guard for routing mistakes.
  if (!['/', '/index.html'].includes(location.pathname)) return;
  const panel = document.getElementById('home-anthem');
  const audio = document.getElementById('home-anthem-audio');
  if (!panel || !audio || panel.dataset.initialized) return;
  panel.dataset.initialized = 'true';
  const toggle = document.getElementById('anthem-toggle');
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
    toggle.textContent = audio.paused ? 'Play Music' : 'Stop Music';
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
      render('Music is playing. Music plays on Home only.');
    } catch (error) {
      if (current !== attempt || suspended) return;
      render(error.name === 'NotAllowedError'
        ? 'Sound did not start. Press Play Music to listen.'
        : 'The music could not start. Press Play Music to try again.');
    }
  }
  toggle.addEventListener('click', () => {
    if (audio.paused) play(true);
    else pause('Music stopped. It will stay off for this visit.', true, true);
  });
  audio.addEventListener('play', () => {
    if (suspended) { audio.pause(); return; }
    if (audio.paused) return; // Ignore a queued play event after a stop or navigation.
    render(audio.muted ? 'Music is muted.' : 'Music is playing. Music plays on Home only.');
  });
  audio.addEventListener('pause', () => {
    if (!audio.paused) return;
    if (!suspended && !audio.ended) preference(true);
    render(status.textContent.startsWith('Music is playing') ? 'Music paused. Press Play Music to listen again.' : undefined);
  });
  audio.addEventListener('ended', () => { preference(true); render('Music finished. Press Play Music to listen again.'); });
  audio.addEventListener('error', () => render('The music could not load. Press Play Music to try again.'));
  document.addEventListener('play', event => {
    if (event.target !== audio && event.target instanceof HTMLMediaElement) {
      pause('Music paused for other media. Press Play Music to listen again.');
    }
  }, true);
  // pagehide covers ordinary navigation and bfcache. Restoring Home never resumes sound.
  window.addEventListener('pagehide', () => { suspended = true; pause('Music paused. Press Play Music to listen again.', false); });
  window.addEventListener('pageshow', event => {
    suspended = false;
    if (event.persisted) pause('Music paused. Press Play Music to listen again.', false);
  });
  panel.hidden = false;
  render(optedOut ? 'Music is off for this visit. Press Play Music to listen.' : 'Press Play Music to listen.');
  if (!optedOut) play(false);
})();
