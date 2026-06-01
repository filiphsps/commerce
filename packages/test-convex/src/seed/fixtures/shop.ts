import type { Doc } from '../../../../convex/convex/_generated/dataModel';

/**
 * The canonical demo shop's preserved Mongo `ObjectId` string. The unified `shops` row keys external
 * references off `legacyId` (projected to `shop.id`), NOT Convex's branded `_id`, so the fixture pins a
 * stable value rather than minting a fresh id per seed — keeping every externally-persisted reference
 * (sessions, carts, ISR output) deterministic across re-seeds.
 */
export const DEFAULT_SHOP_LEGACY_ID = 'a1b2c3d4e5f6a1b2c3d4e5f6';

/** Primary routable domain of the canonical demo tenant. */
export const DEFAULT_SHOP_DOMAIN = 'nordcom-demo-shop.com';

/** Display name of the canonical demo tenant. */
export const DEFAULT_SHOP_NAME = 'Nordcom Demo Shop';

/**
 * Secondary routable domains carried verbatim from the Mongo `seed/shop.ts` fixture. Each becomes its
 * own `shopDomains` row (the `findByDomain` hot path cannot index array membership) AND stays on the
 * `shops.alternativeDomains` array to preserve the frozen `ShopBase` shape.
 */
const ALTERNATIVE_DOMAINS = ['nordcom.shop', 'demo.nordcom.commerce'] as const;

/**
 * The `shops` row payload MINUS the system fields and the managed timestamps the seed mutation stamps at
 * insert time. Typed off the generated `Doc<'shops'>` so the fixture cannot drift from `shopValidator`:
 * an extra key (e.g. the dropped `contentProvider`) or a leaked secret fails to type-check here.
 */
type CanonicalShopRow = Omit<Doc<'shops'>, '_id' | '_creationTime' | 'createdAt' | 'updatedAt'>;

/**
 * The fully-resolved canonical shop fixture, pre-split into the three target tables: the public
 * `shops` row (carrying NO secret), the 1:1 `shopCredentials` payload, and the flat list of routable
 * domains that each become one `shopDomains` row.
 */
export interface CanonicalShopFixture {
    /** Public `shops` row payload, sans system fields/timestamps and sans every masked credential. */
    shop: CanonicalShopRow;
    /**
     * Split-out commerce credentials destined ONLY for `shopCredentials`. The demo fixture configures no
     * Customer Account API, so `clientSecret` is absent; only the private Storefront `token` is present.
     */
    credentials: { token?: string; clientSecret?: string };
    /** Primary domain followed by every alternative domain; one `shopDomains` row is written per entry. */
    domains: string[];
}

/**
 * Customization knobs for {@link buildCanonicalShopFixture}. All optional — the defaults reproduce the
 * canonical `nordcom-demo-shop.com` tenant verbatim.
 */
export interface CanonicalShopFixtureOptions {
    /** Override the primary routable domain (e.g. for a staging tenant). */
    domain?: string;
    /** Override the display name (also used as the logo/favicon `alt` text). */
    name?: string;
}

/**
 * Builds the canonical demo shop fixture, re-expressing the Mongo `seed/shop.ts` payload against the
 * unified Convex schema. The design/accents/icons/integrations/thirdParty data is carried verbatim; the
 * source's masked `commerceProvider.authentication.token` is lifted OUT of the row into
 * {@link CanonicalShopFixture.credentials} so the public row physically cannot carry it.
 *
 * The Mongo source carried a `contentProvider: { type: 'shopify' }` field. It is DELIBERATELY DROPPED:
 * the unified Option-B model collapses shop and tenant into one row whose CMS content lives in
 * Convex-native CMS tables, so there is no separate content provider concept on the frozen `ShopBase`,
 * and `shopValidator` rejects the unknown key. Dropping it is the migration's intended behavior, not a
 * data loss.
 *
 * @param opts - Optional domain/name overrides; omitting them yields the canonical fixture.
 * @returns The shop row, split-out credentials, and routable-domain list.
 */
export function buildCanonicalShopFixture(opts: CanonicalShopFixtureOptions = {}): CanonicalShopFixture {
    const domain = opts.domain ?? DEFAULT_SHOP_DOMAIN;
    const name = opts.name ?? DEFAULT_SHOP_NAME;

    return {
        shop: {
            legacyId: DEFAULT_SHOP_LEGACY_ID,
            name,
            description:
                'A small Stockholm studio building clothing meant to be kept. Free returns within 30 days; lifetime repair guarantee on every garment.',
            domain,
            alternativeDomains: [...ALTERNATIVE_DOMAINS],
            i18n: { defaultLocale: 'en-US' },
            commerce: { maxQuantity: 25, processingTimeInDays: 3 },
            showProductVendor: true,
            design: {
                header: {
                    logo: { width: 175, height: 60, src: 'https://placehold.co/175x60.png', alt: name },
                },
                accents: [
                    { type: 'primary', color: '#0a0a0a', foreground: '#fafafa' },
                    { type: 'secondary', color: '#c8a36a', foreground: '#0a0a0a' },
                ],
            },
            icons: { favicon: { width: 512, height: 512, src: '/favicon.png', alt: name } },
            commerceProvider: {
                type: 'shopify',
                domain: 'mock.shop',
                authentication: { publicToken: 'test-public-token' },
                id: 'test-shop-id',
                storefrontId: 'test-storefront-id',
            },
            integrations: { judgeme: { publicToken: 'judgeme-public-token' } },
            thirdParty: { googleTagManager: 'GTM-DEMO123', intercom: 'demo-intercom-app-id' },
        },
        credentials: { token: 'test-token' },
        domains: [domain, ...ALTERNATIVE_DOMAINS],
    };
}
