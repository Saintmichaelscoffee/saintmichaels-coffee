'use strict';
(() => {
  const url = 'https://saintmichaelscoffee.com/answer-the-call-song.html';
  const copy = document.getElementById('copy-link');
  const shareStatus = document.getElementById('share-status');
  copy.hidden = false;
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
      shareStatus.textContent = 'Song link copied.';
    } catch {
      shareStatus.textContent = 'Copy this song link: ' + url;
    }
  });
  const audio = document.getElementById('song-audio');
  const status = document.getElementById('audio-status');
  // No request is made until an approved, same-origin audio source is supplied.
  if (audio.querySelector('source[src]') || audio.getAttribute('src')) {
    audio.hidden = false;
    status.textContent = 'Press play to listen.';
    audio.addEventListener('error', () => {
      status.textContent = 'The song could not load. Please try again later.';
    });
  }
})();
