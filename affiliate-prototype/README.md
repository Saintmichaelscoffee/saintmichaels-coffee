# Saint Michaels Coffee affiliate proof of concept

Local application for reviewing affiliate applications, activating accounts, measuring referral visits, recording verified Shopify webhook events, and approving commissions. It uses Node 24's built-in SQLite and needs no paid account for a local test.

## Run

`ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD='a long unique password' SESSION_SECRET='at least 32 random characters here' npm start`

Open http://localhost:3210/affiliate and http://localhost:3210/admin/affiliates. Initial owner credentials are provisioned once, only when the database is new. Never use example credentials in production. Outgoing messages are stored in an admin-only outbox for local review; no email is sent.

To test signed Shopify order events locally, set `SHOPIFY_WEBHOOK_SECRET` and POST raw JSON with `X-Shopify-Hmac-Sha256` and `X-Shopify-Topic` headers to `/api/shopify/webhook`. Installing the Shopify app alone does not register these webhook subscriptions; the event flow is still a local simulation.

## Shopify checkout bridge

Set `SHOPIFY_STORE_DOMAIN` to the verified `*.myshopify.com` domain, `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` to the installed Dev Dashboard app credentials in a private server environment, and `SHOPIFY_VARIANT_ID` to a real `gid://shopify/ProductVariant/...` value. The app and store must belong to the same Shopify organization for the client credentials grant. Server code renews its 24-hour Admin token, delegates only Storefront scopes, then creates carts using a private Storefront token. An existing `SHOPIFY_STOREFRONT_TOKEN` also works instead of client credentials. If the checkout URL uses a different custom domain, set `SHOPIFY_CHECKOUT_DOMAIN` to that hostname. POST `/api/shopify/cart` from a same-origin button or form. The server checks its opaque 30-day referral cookie, creates a Shopify cart with the affiliate code as a cart attribute, and redirects to Shopify's checkout URL. An anonymous shopper works without a referral. This checkout bridge is not enabled on the public website. The exact Shopify cart-attribute-to-order transfer must be tested with an actual store order before commissions can be trusted. Never put app secrets or Admin API tokens in the website or GitHub.

`shopify.example.env` records the verified product preview store and initial espresso variant. The preview reports that the store is password protected. Do not commit a real token or copy a product preview key into configuration.

## Shopify checkout bridge

Set `SHOPIFY_STORE_DOMAIN` to the verified `*.myshopify.com` domain, `SHOPIFY_STOREFRONT_TOKEN` to a Storefront API token, and `SHOPIFY_VARIANT_ID` to a real `gid://shopify/ProductVariant/...` value. If the checkout URL uses a different custom domain, set `SHOPIFY_CHECKOUT_DOMAIN` to that hostname. POST `/api/shopify/cart` from a same-origin button or form. The server checks its opaque 30-day referral cookie, creates a Shopify cart with the affiliate code as a cart attribute, and redirects to Shopify's checkout URL. An anonymous shopper works without a referral. This checkout bridge is not enabled on the public website. The exact Shopify cart-attribute-to-order transfer must be tested with an actual store order before commissions can be trusted. Do not expose an Admin API token in client code.

`shopify.example.env` records the verified product preview store and initial espresso variant. The preview reports that the store is password protected. Do not commit a real token or copy a product preview key into configuration.

## Production blockers

This is a functional **local prototype**, not a deployment-ready commerce application. SQLite on Vercel's ephemeral filesystem cannot safely hold live affiliate records. Before production, replace the persistence adapter with managed Postgres and private object storage, wire a verified Shopify app and real order flows, connect transactional email, and review privacy/affiliate terms. Shopify's real order payload and the actual website-to-checkout handoff must be validated end to end. Keep the site unchanged until those gates pass. Do not put the SQLite file, secrets, or upload directory in Git.
