import mongoose from 'mongoose';

import { seedCms } from './cms';
import { seedShop } from './shop';

/**
 * Seeds the canonical demo tenant: one Shop (`nordcom-demo-shop.com`,
 * "Nordcom Demo Shop") plus tenant-scoped Header/Footer/BusinessData/Page/
 * Article. Idempotent — safe to call repeatedly against the same URI.
 */
export async function seedCanonical(uri: string): Promise<void> {
    await seedShop(uri);

    const conn = await mongoose.createConnection(uri, { bufferCommands: false }).asPromise();
    let tenantId: string;
    try {
        const shop = await conn.collection('shops').findOne({ domain: 'nordcom-demo-shop.com' });
        if (!shop) throw new Error('[seedCanonical] expected the demo shop to exist after seedShop()');
        tenantId = String(shop._id);
    } finally {
        await conn.close();
    }

    await seedCms(uri, { tenantId });
}
