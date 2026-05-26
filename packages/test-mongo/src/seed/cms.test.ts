import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type StartedMongo, startMongo } from '../start';
import { seedCms } from './cms';
import { seedShop } from './shop';

let handle: StartedMongo;
let tenantId: string;

beforeAll(async () => {
    handle = await startMongo();
    process.env.MONGODB_URI = handle.uri;
    process.env.PAYLOAD_SECRET = 'test-secret';
    await seedShop(handle.uri);

    const conn = await mongoose.createConnection(handle.uri).asPromise();
    const shop = await conn.collection('shops').findOne({ domain: 'nordcom-demo-shop.com' });
    tenantId = String(shop?._id);
    await conn.close();
});

afterAll(async () => {
    await handle.stop();
});

describe('seedCms', () => {
    it('creates exactly one Header/Footer/BusinessData and one Page + one Article, scoped to the tenant', async () => {
        await seedCms(handle.uri, { tenantId });

        const conn = await mongoose.createConnection(handle.uri).asPromise();
        const tenantObjectId = new mongoose.Types.ObjectId(tenantId);
        const header = await conn.collection('header').find({ tenant: tenantObjectId }).toArray();
        const footer = await conn.collection('footer').find({ tenant: tenantObjectId }).toArray();
        const business = await conn.collection('businessData').find({ tenant: tenantObjectId }).toArray();
        const pages = await conn.collection('pages').find({ tenant: tenantObjectId }).toArray();
        const articles = await conn.collection('articles').find({ tenant: tenantObjectId }).toArray();

        expect(header).toHaveLength(1);
        expect(footer).toHaveLength(1);
        expect(business).toHaveLength(1);
        expect(pages).toHaveLength(1);
        expect(articles).toHaveLength(1);
        await conn.close();
    });

    it('is idempotent', async () => {
        await seedCms(handle.uri, { tenantId });
        await seedCms(handle.uri, { tenantId });

        const conn = await mongoose.createConnection(handle.uri).asPromise();
        const tenantObjectId = new mongoose.Types.ObjectId(tenantId);
        const pages = await conn.collection('pages').find({ tenant: tenantObjectId }).toArray();
        expect(pages.length).toBeLessThanOrEqual(1);
        await conn.close();
    });
});
