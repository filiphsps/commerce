import type { Doc } from '../../../../convex/convex/_generated/dataModel';

/**
 * Feature-flag fixtures for the seeded demo tenant, ported from the Mongo seed
 * (the retired Mongo seed harness's `seed/fixtures/feature-flags.ts`) into the Convex-native
 * `featureFlags` table shape. Ten flags exercising every field on the global feature-flag
 * table — `defaultValue` + `options` + `targeting` rules — so admin tooling and runtime
 * evaluators both have realistic material to render against.
 *
 * Two source quirks are dropped in the Convex port:
 *   - The Payload `type: 'json'` Monaco field demanded a `JSON.stringify`d payload (and the
 *     `{ … }`-wrapping of bare booleans that the `required && !value` validator quirk forced).
 *     The Convex `jsonValueValidator` stores NATIVE JSON values, so every `defaultValue` /
 *     `options[].value` / `targeting[].{params,value}` here is the real, un-stringified value.
 *   - The Payload `_status: 'published'` lifecycle flag — Convex-native rows carry none.
 *
 * `legacyId` pins a stable Mongo-`ObjectId`-shaped string per flag (the source rows had
 * auto-assigned `_id`s) so re-seeds and any `by_legacy_id` resolution stay deterministic.
 */

/** The portion of a `featureFlags` row the seed fixture supplies; timestamps are stamped at insert. */
export type FeatureFlagSeed = Omit<Doc<'featureFlags'>, '_id' | '_creationTime' | 'createdAt' | 'updatedAt'>;

export const featureFlagFixtures: FeatureFlagSeed[] = [
    {
        legacyId: 'f1a2b3c4d5e6f1a2b3c4d501',
        key: 'storefront.cart.cross-tab-sync',
        description: 'Mirror cart state across tabs via BroadcastChannel.',
        defaultValue: { enabled: true },
        options: [
            { label: 'Enabled', value: { enabled: true } },
            { label: 'Disabled', value: { enabled: false } },
        ],
        targeting: [
            {
                rule: 'tenant-domain',
                params: { domains: ['nordcom-demo-shop.com'] },
                value: { enabled: true },
                description: 'Always on for the demo tenant.',
            },
        ],
    },
    {
        legacyId: 'f1a2b3c4d5e6f1a2b3c4d502',
        key: 'storefront.checkout.express-payments',
        description: 'Surface Apple Pay / Google Pay buttons above the email field.',
        defaultValue: { mode: 'auto' },
        options: [
            { label: 'Always on', value: { mode: 'on' } },
            { label: 'Always off', value: { mode: 'off' } },
            { label: 'Auto (locale-aware)', value: { mode: 'auto' } },
        ],
        targeting: [
            {
                rule: 'locale-in',
                params: { locales: ['en-US', 'en-GB', 'en-CA'] },
                value: { mode: 'on' },
                description: 'Force-on for English-speaking markets where Apple Pay coverage is highest.',
            },
            {
                rule: 'locale-in',
                params: { locales: ['sv-SE', 'no-NO', 'da-DK'] },
                value: { mode: 'off' },
                description: 'Force-off for Nordics — Klarna is the dominant rail there.',
            },
        ],
    },
    {
        legacyId: 'f1a2b3c4d5e6f1a2b3c4d503',
        key: 'storefront.product.recommendations',
        description: 'Recommendation engine powering the PDP "you might also like" rail.',
        defaultValue: { engine: 'shopify-related', limit: 8 },
        options: [
            { label: 'Shopify "related"', value: { engine: 'shopify-related', limit: 8 } },
            { label: 'Algolia recommend', value: { engine: 'algolia', limit: 12 } },
            { label: 'Disabled', value: { engine: 'off' } },
        ],
        targeting: [],
    },
    {
        legacyId: 'f1a2b3c4d5e6f1a2b3c4d504',
        key: 'storefront.search.autocomplete',
        description: 'Inline autocomplete suggestions in the header search.',
        defaultValue: { enabled: true, provider: 'shopify-predictive' },
        options: [
            { label: 'Shopify predictive', value: { enabled: true, provider: 'shopify-predictive' } },
            { label: 'Algolia autocomplete', value: { enabled: true, provider: 'algolia' } },
            { label: 'Off', value: { enabled: false } },
        ],
        targeting: [],
    },
    {
        legacyId: 'f1a2b3c4d5e6f1a2b3c4d505',
        key: 'storefront.plp.infinite-scroll',
        description: 'Auto-load more products as the user scrolls instead of paginating.',
        defaultValue: { mode: 'load-more-button' },
        options: [
            { label: 'Paginated', value: { mode: 'paginated' } },
            { label: 'Load-more button', value: { mode: 'load-more-button' } },
            { label: 'Infinite scroll', value: { mode: 'infinite-scroll' } },
        ],
        targeting: [],
    },
    {
        legacyId: 'f1a2b3c4d5e6f1a2b3c4d506',
        key: 'storefront.pdp.bundle-builder',
        description: 'Show the "complete the look" bundle builder on PDP.',
        defaultValue: { enabled: false },
        options: [
            { label: 'Enabled', value: { enabled: true } },
            { label: 'Disabled', value: { enabled: false } },
        ],
        targeting: [
            {
                rule: 'collection-handle-in',
                params: { handles: ['featured', 'tops'] },
                value: { enabled: true },
                description: 'Pilot on Featured + Tops before rolling out wider.',
            },
        ],
    },
    {
        legacyId: 'f1a2b3c4d5e6f1a2b3c4d507',
        key: 'storefront.analytics.consent-mode',
        description: 'Google Consent Mode v2 routing for analytics tags.',
        defaultValue: { mode: 'granted-storage', region: 'eu' },
        options: [
            { label: 'Granted (storage)', value: { mode: 'granted-storage', region: 'eu' } },
            { label: 'Granted (denied storage)', value: { mode: 'granted-no-storage', region: 'eu' } },
            { label: 'Denied', value: { mode: 'denied', region: 'eu' } },
        ],
        targeting: [],
    },
    {
        legacyId: 'f1a2b3c4d5e6f1a2b3c4d508',
        key: 'storefront.cart.shipping-progress-bar',
        description: 'Show a "X more to free shipping" progress bar in the cart drawer.',
        defaultValue: { enabled: true, threshold: 12000, currency: 'EUR' },
        options: [
            { label: 'Enabled (EUR 120)', value: { enabled: true, threshold: 12000, currency: 'EUR' } },
            { label: 'Enabled (USD 100)', value: { enabled: true, threshold: 10000, currency: 'USD' } },
            { label: 'Disabled', value: { enabled: false } },
        ],
        targeting: [],
    },
    {
        legacyId: 'f1a2b3c4d5e6f1a2b3c4d509',
        key: 'storefront.checkout.upsells',
        description: 'Post-cart upsell carousel before payment step.',
        defaultValue: { enabled: false },
        options: [
            { label: 'Enabled', value: { enabled: true, limit: 4 } },
            { label: 'Disabled', value: { enabled: false } },
        ],
        targeting: [
            {
                rule: 'cart-total-above',
                params: { thresholdCents: 8000, currency: 'EUR' },
                value: { enabled: true, limit: 4 },
                description: 'Only show upsells when the cart already clears €80.',
            },
        ],
    },
    {
        legacyId: 'f1a2b3c4d5e6f1a2b3c4d510',
        key: 'storefront.experimental.scroll-restoration-v2',
        description: 'New scroll-restoration implementation (RSC-friendly).',
        defaultValue: { enabled: false },
        options: [
            { label: 'Off (default behavior)', value: { enabled: false } },
            { label: 'On for staff only', value: { enabled: true, staffOnly: true } },
            { label: 'On for everyone', value: { enabled: true } },
        ],
        targeting: [
            {
                rule: 'cookie-flag',
                params: { name: 'nordcom-staff', expected: '1' },
                value: { enabled: true },
                description: 'Self-serve opt-in via the staff cookie.',
            },
        ],
    },
];
