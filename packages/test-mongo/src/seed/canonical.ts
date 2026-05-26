import mongoose from 'mongoose';

import { seedCms } from './cms';
import { seedShop } from './shop';

/**
 * Seeds the canonical demo tenant: one Shop (`nordcom-demo-shop.com`,
 * "Nordcom Demo Shop") plus tenant-scoped Header/Footer/BusinessData/Page/
 * Article. Idempotent — safe to call repeatedly against the same URI.
 *
 * @param uri - Mongo connection string Payload + mongoose both bind to.
 */
export async function seedCanonical(uri: string): Promise<void> {
    console.info('[seedCanonical] seeding Shop …');
    const shopStartedAt = Date.now();
    await seedShop(uri);
    console.info(`[seedCanonical] Shop seed complete in ${Date.now() - shopStartedAt}ms`);

    console.info('[seedCanonical] resolving shopId from seeded Shop …');
    const conn = await mongoose.createConnection(uri, { bufferCommands: false }).asPromise();
    let shopId: string;
    try {
        const shop = await conn.collection('shops').findOne({ domain: 'nordcom-demo-shop.com' });
        if (!shop) throw new Error('[seedCanonical] expected the demo shop to exist after seedShop()');
        shopId = String(shop._id);
    } finally {
        await conn.close();
    }
    console.info(`[seedCanonical] shopId=${shopId}; seeding CMS docs …`);

    const cmsStartedAt = Date.now();
    await seedCms(uri, { shopId });
    console.info(`[seedCanonical] CMS seed complete in ${Date.now() - cmsStartedAt}ms`);
}
