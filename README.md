# saintmichaels-coffee

## Customer home-screen app

The public website is installable as **Saint Michaels Coffee** (home-screen label
**SMC Coffee**). `/install.html` contains iPhone/iPad, Android and desktop guidance.
Existing page footers link to this guide; there is no automatic install popup.
The affiliate portal is a separate app on its own origin.

- Manifest: `/manifest.webmanifest`; service worker: `/coffee-sw.js`.
- Icons are proportional reductions of the existing approved `brand-logo.png`,
  centered on a dark square, without cropping, redrawing, or AI generation.
- The service worker caches **only `/offline.html`**. Current pages always use
  the network; no catalog, cart, account, form, order, API, or checkout response
  is saved to Cache Storage. Private routes and other origins bypass interception.
- Internet is required for purchases/forms. Shopify checkout can leave the app.
- No push notifications, new permissions, account creation, or backend services.
- Worker updates follow the normal browser lifecycle; no forced reload of an
  active shopping session. Increment the offline cache version if changing the
  offline notice. Activate cleanup affects only this app's named cache prefix.

### Checks

This is a static HTML website, with no build or package-install step.

    node --check coffee-app.js
    node --check coffee-sw.js
    node tests/customer-pwa-unit.cjs
    node tests/customer-install-unit.cjs
    git diff --check

Optional local Chromium smoke test (requires Playwright and a runnable browser):

    python -m http.server 8137
    node tests/customer-pwa.cjs

Set `CHROMIUM_PATH` if Chromium is not `/usr/bin/chromium`. Check iOS Safari
Add to Home Screen and Android Chrome install on real devices before claiming
those device flows verified. Also confirm production headers and HTTPS scope.
