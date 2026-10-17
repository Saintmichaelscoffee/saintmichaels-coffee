/* A quiet, opt-in home-screen shortcut. No automatic install prompts. */
(() => {
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  let installEvent = null;
  const refresh = () => {
    const button = document.querySelector('[data-coffee-install]');
    if (button) button.hidden = standalone() || !installEvent;
    const status = document.querySelector('[data-coffee-install-status]');
    if (status && standalone()) status.textContent = 'You’re already using the Saint Michaels Coffee app.';
  };
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installEvent = event;
    refresh();
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    refresh();
    const status = document.querySelector('[data-coffee-install-status]');
    if (status) status.textContent = 'Added to your home screen. Look for SMC Coffee.';
  });
  const ready = () => {
    refresh();
    document.querySelector('[data-coffee-install]')?.addEventListener('click', async (event) => {
      if (!installEvent) return;
      const prompt = installEvent;
      installEvent = null;
      event.currentTarget.hidden = true;
      const status = document.querySelector('[data-coffee-install-status]');
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (status) status.textContent = choice.outcome === 'accepted'
          ? 'Installation requested. Look for SMC Coffee on your home screen.'
          : 'No problem. You can keep browsing or add it later using your browser menu.';
      } catch (_) {
        if (status) status.textContent = 'Use the browser instructions below to add it to your home screen.';
      }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/coffee-sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {});
    }, { once: true });
  }
})();
