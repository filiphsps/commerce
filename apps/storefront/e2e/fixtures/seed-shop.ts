/**
 * Playwright globalSetup — seeds the test-shop document into MongoDB.
 *
 * We connect directly via mongoose here instead of importing
 * @nordcom/commerce-db because that package's db.ts starts with
 * `import 'server-only'` which throws outside a Next.js server context.
 *
 * If MONGODB_URI is not set (e.g. local dev without a DB), this setup is a
 * no-op — the tests themselves will simply fail to load data, which is the
 * expected behaviour when infrastructure is unavailable.
 */

import mongoose, { Schema } from 'mongoose';

const TEST_DOMAIN = 'swedish-candy-store.com';

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
            type: { type: String, enum: ['cms', 'shopify', 'builder.io'], default: 'shopify' },
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

export default async function globalSetup(): Promise<void> {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.warn('[seed-shop] MONGODB_URI is not set — skipping test-shop seed.');
        return;
    }

    let connection: mongoose.Connection | undefined;
    try {
        const conn = await mongoose
            .createConnection(uri, {
                autoCreate: true,
                autoIndex: true,
                bufferCommands: false,
            })
            .asPromise();

        connection = conn;

        const ShopModel = conn.models.Shop ?? conn.model('Shop', ShopSchema);

        const existing = await ShopModel.findOne({ domain: TEST_DOMAIN }).lean().exec();
        if (existing) {
            console.info(`[seed-shop] Shop "${TEST_DOMAIN}" already exists — skipping seed.`);
            return;
        }

        await ShopModel.create({
            name: 'Swedish Candy Store (test)',
            domain: TEST_DOMAIN,
            alternativeDomains: [],
            i18n: { defaultLocale: 'en-US' },
            design: {
                header: {
                    logo: { width: 512, height: 512, src: '/logo.png', alt: 'Swedish Candy Store' },
                },
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
        });

        console.info(`[seed-shop] Seeded shop "${TEST_DOMAIN}" successfully.`);
    } catch (err) {
        console.error('[seed-shop] Seed failed (tests may fail):', err);
    } finally {
        await connection?.close();
    }
}

export async function globalTeardown(): Promise<void> {
    // No teardown — keep the seeded document between runs for speed.
    // CI databases are ephemeral so there is nothing to clean up.
}
