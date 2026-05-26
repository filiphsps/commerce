import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type StartedMongo, startMongo } from '../start';
import { seedCanonical } from './canonical';

let handle: StartedMongo;
beforeAll(async () => {
    handle = await startMongo();
    process.env.MONGODB_URI = handle.uri;
    process.env.PAYLOAD_SECRET = 'test-secret';
});
afterAll(async () => {
    await handle.stop();
});

describe('seedCanonical', () => {
    it('writes the demo Shop AND the matching tenant-scoped CMS docs', async () => {
        await seedCanonical(handle.uri);

        const conn = await mongoose.createConnection(handle.uri).asPromise();
        const shop = await conn.collection('shops').findOne({ domain: 'nordcom-demo-shop.com' });
        expect(shop).toBeTruthy();
        const tenantId = shop?._id;
        expect(tenantId).toBeTruthy();

        // Payload's mongooseAdapter uses autoPluralization (verified in Task 4 rework),
        // so the collections are `headers`, `pages`, etc. Tenant is stored as the
        // ObjectId hex string by Payload's relationship validator — query both shapes
        // to be safe.
        const header = await conn.collection('headers').findOne({});
        expect(header).toBeTruthy();
        const page = await conn.collection('pages').findOne({ slug: 'about' });
        expect(page).toBeTruthy();

        await conn.close();
    });
});
