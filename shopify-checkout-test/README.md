# Isolated Shopify checkout test

Deploy this directory as a **separate Vercel project** with root directory `shopify-checkout-test`, Node.js 24, and deployment protection enabled. It does not use the affiliate SQLite database, record leads, create commissions, or modify the live website. This test checks whether the installed Shopify app can create a cart with a `sm_affiliate_code` attribute and whether that attribute appears on an actual paid order.

Set these **private server environment variables** in the separate project's Preview environment:

- `TEST_ACCESS_KEY`: unique random value of at least 24 characters. Use as the browser password for username `tester`; do not put it in a URL or source code.
- `SHOPIFY_STORE_DOMAIN=b95as8-ck.myshopify.com`
- `SHOPIFY_VARIANT_ID=gid://shopify/ProductVariant/47275834572972`
- `SHOPIFY_CLIENT_ID`: installed app client ID.
- `SHOPIFY_CLIENT_SECRET`: installed app client secret. Enter directly in Vercel; never paste into chat or GitHub.
- `SHOPIFY_CHECKOUT_DOMAIN`: only if Shopify returns checkout URLs at a different verified hostname.

Open the protected deployment in a browser, sign in as `tester` using `TEST_ACCESS_KEY` as the password, enter `TEST123`, and submit. The response redirects to Shopify checkout for one bag. Place only a controlled test order, then inspect its `note_attributes` for `sm_affiliate_code=TEST123`. Store password protection or Shopify checkout settings may prevent completion; resolve those separately.

This harness does not prove that the affiliate application database, referral cookie, webhook subscriptions, and commission workflow work across a deployed service. Those require durable storage and their own end-to-end test before a public affiliate launch.
