# Saint Michaels Coffee affiliate proof of concept

Local application for reviewing affiliate applications, activating accounts, measuring referral visits, recording verified Shopify webhook events, and approving commissions. It uses Node 24's built-in SQLite and needs no paid account for a local test.

## Run

`ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD='a long unique password' SESSION_SECRET='at least 32 random characters here' npm start`

Open http://localhost:3210/affiliate and http://localhost:3210/admin/affiliates. Initial owner credentials are provisioned once, only when the database is new. Never use example credentials in production. Outgoing messages are stored in an admin-only outbox for local review; no email is sent.

To test signed Shopify order events locally, set `SHOPIFY_WEBHOOK_SECRET` and POST raw JSON with `X-Shopify-Hmac-Sha256` and `X-Shopify-Topic` headers to `/api/shopify/webhook`. No Shopify app is installed.

## Production blockers

This is a functional **local prototype**, not a deployment-ready commerce application. SQLite on Vercel's ephemeral filesystem cannot safely hold live affiliate records. Before production, replace the persistence adapter with managed Postgres and private object storage, wire a verified Shopify app and real order flows, connect transactional email, and review privacy/affiliate terms. Shopify's real order payload and the actual website-to-checkout handoff must be validated end to end. Keep the site unchanged until those gates pass. Do not put the SQLite file, secrets, or upload directory in Git.
