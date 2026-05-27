import { ShopSchema } from '@nordcom/commerce-db/models/shop';
import { createConnection, type Schema } from 'mongoose';

/**
 * Customization knobs for {@link seedShop}. All fields are optional —
 * defaults produce the canonical `nordcom-demo-shop.com` fixture.
 *
 * @example
 * ```ts
 * // Pin a different domain for a staging environment:
 * await seedShop(uri, { domain: 'staging.example.com' });
 * ```
 */
export interface SeedShopOptions {
    domain?: string;
    name?: string;
    overrides?: Record<string, unknown>;
}

const DEFAULT_DOMAIN = 'nordcom-demo-shop.com';

/**
 * Creates the canonical demo Shop document via a direct Mongoose connection,
 * bypassing Payload. Idempotent — skips insert when a document with the same
 * domain already exists.
 *
 * @param uri - MongoDB connection string; also written to `MONGODB_URI` if the
 *   env var is absent, so downstream Payload bootstraps bind to the same instance.
 * @param opts - Optional overrides for domain, display name, and raw schema fields.
 * @returns Resolves once the Shop document is present in the database.
 * @example
 * ```ts
 * const { uri } = await startMongo();
 * await seedShop(uri);
 * ```
 */
export async function seedShop(uri: string, opts: SeedShopOptions = {}): Promise<void> {
    const domain = opts.domain ?? DEFAULT_DOMAIN;
    const name = opts.name ?? 'Nordcom Demo Shop';

    // `@nordcom/commerce-db/db` reads MONGODB_URI at module load. Set it before
    // `seedShop` is invoked in the real runtime so the top-level connect target
    // matches the MMS instance. In the Vitest setup the connect call itself is
    // mocked, so this assignment is a no-op for unit tests.
    if (!process.env.MONGODB_URI) process.env.MONGODB_URI = uri;

    console.info(`[seedShop] connecting to mongo for tenant domain=${domain} …`);
    const conn = await createConnection(uri, { bufferCommands: false }).asPromise();
    try {
        // The production `ShopSchema` is typed as `Schema<ShopBase>`. `ShopBase`
        // models the live runtime shape (post-CMS sync) and omits a few fields
        // the raw create payload uses (e.g. `contentProvider`), so the typed
        // overload of `conn.model().create()` rejects the seed object. Cast
        // here to keep the schema-as-source-of-truth principle without
        // broadening the production types just for a test fixture.
        const ShopModel = conn.model('Shop', ShopSchema as unknown as Schema);
        const existing = await ShopModel.findOne({ domain }).lean().exec();
        if (existing) {
            console.info(`[seedShop] tenant ${domain} already present (id=${existing._id}) — skipping insert`);
            return;
        }

        console.info(`[seedShop] inserting Shop ${domain} (${name}) …`);
        await ShopModel.create({
            name,
            description:
                'A small Stockholm studio building clothing meant to be kept. Free returns within 30 days; lifetime repair guarantee on every garment.',
            domain,
            alternativeDomains: ['nordcom.shop', 'demo.nordcom.commerce'],
            i18n: { defaultLocale: 'en-US' },
            commerce: { maxQuantity: 25, processingTimeInDays: 3 },
            showProductVendor: true,
            design: {
                header: {
                    logo: { width: 175, height: 60, src: 'https://placehold.co/175x60.png', alt: name },
                },
                // Two accent pairs cover the storefront's `--accent-*` /
                // `--secondary-*` CSS variables. `color` is the surface,
                // `foreground` is the text/icon overlay — both must clear
                // WCAG AA against each other.
                accents: [
                    { type: 'primary', color: '#0a0a0a', foreground: '#fafafa' },
                    { type: 'secondary', color: '#c8a36a', foreground: '#0a0a0a' },
                ],
            },
            // The production `ShopSchema` declares `icons.favicon.src/alt` as
            // required string paths, so Mongoose's nested-object auto-create
            // raises validation errors unless the seed provides values.
            icons: { favicon: { width: 512, height: 512, src: '/favicon.png', alt: name } },
            contentProvider: { type: 'shopify' },
            commerceProvider: {
                type: 'shopify',
                domain: 'mock.shop',
                authentication: { token: 'test-token', publicToken: 'test-public-token' },
                id: 'test-shop-id',
                storefrontId: 'test-storefront-id',
            },
            collaborators: [],
            integrations: { judgeme: { publicToken: 'judgeme-public-token' } },
            thirdParty: { googleTagManager: 'GTM-DEMO123', intercom: 'demo-intercom-app-id' },
            ...opts.overrides,
        });
        console.info(`[seedShop] inserted Shop ${domain}`);
    } finally {
        await conn.close();
    }
}
