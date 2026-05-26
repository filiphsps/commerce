import mongoose, { Schema } from 'mongoose';

export interface SeedShopOptions {
    domain?: string;
    name?: string;
    overrides?: Record<string, unknown>;
}

// Schema mirrors the production `Shop` model in packages/db. We can't import
// that file directly because it begins with `import 'server-only'`. Keeping
// the test schema standalone also lets us evolve test fixtures independently.
const ShopSchema = new Schema(
    {
        name: { type: String, required: true },
        domain: { type: String, unique: true, required: true },
        alternativeDomains: [{ type: String, default: [] }],
        i18n: {
            defaultLocale: { type: String, required: true, default: 'en-US' },
        },
        design: {
            header: {
                logo: {
                    width: { type: Number, default: 512 },
                    height: { type: Number, default: 512 },
                    src: { type: String, default: '' },
                    alt: { type: String, default: '' },
                },
            },
            accents: { type: [], default: [] },
        },
        contentProvider: {
            type: { type: String, enum: ['prismic', 'shopify', 'builder.io'], default: 'shopify' },
        },
        commerceProvider: {
            type: { type: String, enum: ['shopify', 'stripe'], default: 'shopify' },
            domain: { type: String, default: 'mock.shop' },
            authentication: {
                token: { type: String, default: '' },
                publicToken: { type: String, default: '' },
            },
            id: { type: String, default: '' },
            storefrontId: { type: String, default: '' },
        },
        collaborators: { type: [], default: [] },
    },
    { id: true, timestamps: true },
);

const DEFAULT_DOMAIN = 'nordcom-demo-shop.com';

export async function seedShop(uri: string, opts: SeedShopOptions = {}): Promise<void> {
    const domain = opts.domain ?? DEFAULT_DOMAIN;
    const name = opts.name ?? 'Nordcom Demo Shop';

    const conn = await mongoose.createConnection(uri, { bufferCommands: false }).asPromise();
    try {
        // The connection is brand new (we create it on every call), so the
        // model isn't registered yet. Always register fresh — no need for the
        // `conn.models.Shop ??` guard the legacy seed-shop.ts had.
        const ShopModel = conn.model('Shop', ShopSchema);
        const existing = await ShopModel.findOne({ domain }).lean().exec();
        if (existing) return;

        await ShopModel.create({
            name,
            domain,
            alternativeDomains: [],
            i18n: { defaultLocale: 'en-US' },
            design: {
                header: { logo: { width: 512, height: 512, src: '/logo.png', alt: name } },
                accents: [],
            },
            contentProvider: { type: 'shopify' },
            commerceProvider: {
                type: 'shopify',
                domain: 'mock.shop',
                authentication: { token: 'test-token', publicToken: 'test-public-token' },
                id: 'test-shop-id',
                storefrontId: 'test-storefront-id',
            },
            collaborators: [],
            ...opts.overrides,
        });
    } finally {
        await conn.close();
    }
}
