/**
 * Feature-flag fixtures for the seeded demo tenant. Three flags exercising
 * every CMS field on the collection — defaultValue + options + targeting
 * rules — so admin tooling and runtime evaluators both have realistic
 * material to render against.
 *
 * The CMS field `value` is `type: 'json' + required: true`. Payload's
 * required validator on JSON treats any falsy value as missing (`!false ===
 * true`), and the sanitizer is invoked on raw values — through the local
 * API, the cleanest way to pass `false` / strings / plain objects is to
 * hand-stringify them. We expose the rich data to TypeScript via
 * `featureFlagFixtures` and stringify at the seed boundary in `seedCms`.
 */

export interface FeatureFlagFixture {
    key: string;
    description: string;
    defaultValue: unknown;
    options?: Array<{ label: string; value: unknown }>;
    targeting?: Array<{ rule: string; params: Record<string, unknown>; value: unknown; description?: string }>;
}

export const featureFlagFixtures: FeatureFlagFixture[] = [
    {
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
        key: 'storefront.product.recommendations',
        description: 'Recommendation engine to power the PDP "you might also like" rail.',
        defaultValue: { engine: 'shopify-related', limit: 8 },
        options: [
            { label: 'Shopify "related"', value: { engine: 'shopify-related', limit: 8 } },
            { label: 'Algolia recommend', value: { engine: 'algolia', limit: 12 } },
            { label: 'Disabled', value: { engine: 'off' } },
        ],
    },
];
