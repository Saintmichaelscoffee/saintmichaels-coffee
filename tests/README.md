Run customer-pwa-unit.cjs and customer-install-unit.cjs with Node. The optional customer-pwa.cjs smoke test needs Playwright, Chromium, and the local server described in the root README.

Run `node tests/subscription-handoff.cjs` with Playwright installed to test all 20 supported subscription/one-time payloads, redirect linker preservation and selection guards. All requests are intercepted; the test sends no commerce or analytics data. Set `PLAYWRIGHT_MODULE` to an installed package path and `BROWSER_CHANNEL=msedge` if required on Windows.

Run `node tests/evergreen-release.cjs` for the staged evergreen-shop release audit. It checks all HTML entry points at desktop, 390px and 320px widths with external submissions blocked. Use the same Playwright/browser environment variables; optionally set `RELEASE_AUDIT_OUTPUT` for screenshots and results. See `docs/evergreen-release.md` for the release gate and separate Shopify checks.
