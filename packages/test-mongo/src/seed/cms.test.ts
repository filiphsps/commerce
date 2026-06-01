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
    it('scopes the canonical CMS docs directly to the shop row id (no separate tenant doc)', async () => {
        await seedCms(handle.uri, { shopId });

        const conn = await mongoose.createConnection(handle.uri).asPromise();
        // UNIFY-09: the multi-tenant plugin keys on `shops` (shop == tenant), so
        // every tenant-scoped doc's `tenant` field holds the shop row's own
        // ObjectId. The seed no longer creates a separate `tenants` document —
        // reads scope straight to the shop id, which is what `resolveTenantId`
        // returns at runtime.
        const tenantObjectId = new mongoose.Types.ObjectId(shopId);
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

        // The unified `shops` collection is the only tenant collection — the
        // legacy dedicated `tenants` collection is never created by the seed.
        const db = conn.getClient().db(conn.name);
        const tenantCollections = await db.listCollections({ name: 'tenants' }).toArray();
        expect(tenantCollections).toHaveLength(0);
        await conn.close();
    });

    it('is idempotent', async () => {
        await seedCms(handle.uri, { shopId });
        await seedCms(handle.uri, { shopId });

        const conn = await mongoose.createConnection(handle.uri).asPromise();
        const tenantObjectId = new mongoose.Types.ObjectId(shopId);
        const header = await conn.collection('headers').find({ tenant: tenantObjectId }).toArray();
        const pages = await conn.collection('pages').find({ tenant: tenantObjectId }).toArray();
        // Tenant-scoped collections are rewritten each run, so the globally
        // singular `header` stays at one doc and pages match the fixture count —
        // never multiplied by the number of seed invocations.
        expect(header).toHaveLength(1);
        expect(pages.length).toBeGreaterThan(0);
        await conn.close();
    });
});
