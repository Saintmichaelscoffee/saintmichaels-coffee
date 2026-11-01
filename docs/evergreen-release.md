# Evergreen shop release

This branch prepares the normal ready-to-sell website. Do not publish until the owner says **go**. No temporary launching/coming-soon gate was added to the coffee shop.

## Website changes

- Remove the homepage waitlist form, signup CTAs across the site, obsolete waitlist JavaScript and event listeners, and remotely delivered Klaviyo signup/popup loaders on Home and Stand Watch. Historical subscribers/consents remain untouched.
- Replace preorder shopping labels with normal Shop Coffee / Choose Options controls. Preserve existing Shopify product destinations, variant IDs, one-time and subscription submission code, regular prices, the 5% subscription offer, and service discount program.
- Remove the special 10% preorder offer, discounted preorder price display, and all announced launch/delivery dates. Display the existing regular prices ($22.99 and $23.49 per 12 oz bag); Shopify catalog prices are not edited by this branch.
- Update Home/Shop metadata, structured data, FAQ, story, blog/article CTAs, navigation, footer and support copy. No replacement launch promise is introduced.
- Preserve company mission, logos/photos/bags/pods, cinematic design, manual song page, official audio and cover, and homepage-only music behavior. Pod concepts remain explicitly in development; their existing Coming Soon label and nonbinding poll are retained. Service-program registration remains, as it is not a launch waitlist.
- Constrain long article citations and decorative Story overflow on narrow screens; no artwork is replaced or cropped.

Some dormant CSS class names include old words such as `waitlist` or `preorder`; they preserve existing layout styling and do not expose a form, collection handler, promotion, or launch claim.

## Checks

Run `node tests/evergreen-release.cjs` with Playwright installed. Set `PLAYWRIGHT_MODULE` to the installed package, `BROWSER_CHANNEL=msedge` on Windows if required, and optionally `RELEASE_AUDIT_OUTPUT` to a review directory. It audits all 20 HTML entry points at desktop, 390px and 320px widths, including body copy, metadata, JSON-LD, absent signup flows, image controls, preserved service/pod forms and no overflow/runtime errors. All external requests are blocked or fulfilled from local files; no signup, poll or order is submitted.

Run the existing `tests/subscription-handoff.cjs` and `tests/analytics-url-hygiene.cjs` with the same Playwright settings. The former intercepts all 20 supported one-time/subscription checkout payloads and safety guards; the latter verifies URL metadata handling and retirement of obsolete waitlist/preorder events.

The existing `tests/customer-pwa-unit.cjs` fails on the unchanged manual song page (`answer-the-call-song.html`) because that older page lacks the manifest registration expected by the blanket test. This pre-existing mismatch is not introduced by this branch. `tests/customer-install-unit.cjs` passes. No PWA or song-page change was made to mask the mismatch.

## Separate Shopify review before go

No Shopify settings, theme, products, inventory, discount definitions, public sales channels, email settings, historical customers/subscribers or orders were changed.

The connected Shopify store-info read returned **Authentication required**. Stop there and restore authorized access before private inventory/discount review. Public reads of the two existing product JSON paths returned HTTP 403, so availability, overselling policy and checkout completion cannot be established from that audit. Do not interpret a 403 as proof checkout is disabled.

Known destinations from existing website source:

- `https://g1gzkr-fe.myshopify.com/products/answer-the-call-organic-espresso-12-oz`
- `https://g1gzkr-fe.myshopify.com/products/stand-watch-single-origin-organic-12-oz`
- Subscription form: `https://g1gzkr-fe.myshopify.com/cart/add`, returning to `/checkout`.

At release, inspect and obtain authorization for any needed store-side changes:

1. Confirm the correct store and shipping readiness for both products and all existing 1/2/3/5-bag variants. Review tracked inventory, fulfillment locations and **Continue selling when out of stock**. Do not fabricate stock quantities or assume a hidden site prevents direct orders.
2. Identify and deactivate only the obsolete automatic 10% preorder discount, if it is still active. Preserve the ordinary 5% subscription savings and the service program's 10% one-time / 15% subscription benefits. Removing website copy does not deactivate a Shopify discount.
3. Audit the Shopify-hosted product descriptions, theme purchase labels, cart/checkout messaging and relevant notification templates for lingering preorder/launch dates. The main-site branch cannot rewrite those external surfaces.
4. Confirm the desired direct-product, saved-cart and checkout behavior for the pre-go period, then test normal ordering after shipping readiness. Do not alter live channels or inventory merely to stage this website.

References: [Shopify out-of-stock selling](https://help.shopify.com/en/manual/inventory-and-locations/setup/selling-when-out-of-stock), [managing discounts](https://help.shopify.com/en/manual/discounts/managing-discounts), [public Product API](https://shopify.dev/docs/api/ajax/reference/product).

## Activation

The current production website is publicly reachable and still contains its older preorder flow while this revision is staged. No traffic estimate or actual orderability is inferred. This branch adds no new live exposure.

After owner **go**, resolve the Shopify checks above, fetch main and preserve concurrent work, rerun checks against the exact release commit, and publish through the existing Git/Vercel workflow. No launch-copy rewrite is needed. Verify the live main pages, metadata, normal product/cart paths and music behavior after deployment.
