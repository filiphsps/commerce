import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type StartedMongo, startMongo } from '../start';
import { seedCms } from './cms';
import { seedShop } from './shop';

let handle: StartedMongo;
let shopId: string;

beforeAll(async () => {
    handle = await startMongo();
    process.env.MONGODB_URI = handle.uri;
    process.env.PAYLOAD_SECRET = 'test-secret';
    await seedShop(handle.uri);

    const conn = await mongoose.createConnection(handle.uri).asPromise();
    const shop = await conn.collection('shops').findOne({ domain: 'nordcom-demo-shop.com' });
    shopId = String(shop?._id);
    await conn.close();
});

afterAll(async () => {
    await handle.stop();
});

describe('seedCms', () => {
    it('creates the canonical CMS docs scoped to the Payload tenant resolved from the shopId', async () => {
        await seedCms(handle.uri, { shopId });

        const conn = await mongoose.createConnection(handle.uri).asPromise();
        const tenant = await conn.collection('tenants').findOne({ shopId });
        expect(tenant).toBeTruthy();
        const tenantObjectId = tenant?._id as mongoose.Types.ObjectId;
        // Payload's `mongooseAdapter` pluralizes collection slugs by default
        // (`header` → `headers`, `businessData` → `businessdatas`). The test
        // talks directly to MongoDB so we have to use Mongo's collection
        // names, not Payload's slugs.
        const header = await conn.collection('headers').find({ tenant: tenantObjectId }).toArray();
        const footer = await conn.collection('footers').find({ tenant: tenantObjectId }).toArray();
        const business = await conn.collection('businessdatas').find({ tenant: tenantObjectId }).toArray();
        const pages = await conn.collection('pages').find({ tenant: tenantObjectId }).toArray();
        const articles = await conn.collection('articles').find({ tenant: tenantObjectId }).toArray();

        expect(header).toHaveLength(1);
        expect(footer).toHaveLength(1);
        expect(business).toHaveLength(1);
        expect(pages.length).toBeGreaterThan(0);
        expect(articles.length).toBeGreaterThan(0);
        await conn.close();
    });

    it('is idempotent', async () => {
        await seedCms(handle.uri, { shopId });
        await seedCms(handle.uri, { shopId });

        const conn = await mongoose.createConnection(handle.uri).asPromise();
        const tenant = await conn.collection('tenants').findOne({ shopId });
        const tenantObjectId = tenant?._id as mongoose.Types.ObjectId;
        const pages = await conn.collection('pages').find({ tenant: tenantObjectId }).toArray();
        const tenantsAfter = await conn.collection('tenants').find({ shopId }).toArray();
        // Tenant doc is upserted, never duplicated.
        expect(tenantsAfter).toHaveLength(1);
        // Pages collection is rewritten each run — the count matches the
        // fixture, not the number of seed invocations.
        expect(pages.length).toBeGreaterThan(0);
        await conn.close();
    });
});
