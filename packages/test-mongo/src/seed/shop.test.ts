import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { type StartedMongo, startMongo } from '../start';
import { seedShop } from './shop';

let handle: StartedMongo;
beforeAll(async () => {
    handle = await startMongo();
});
afterAll(async () => {
    await handle.stop();
});

afterEach(async () => {
    const conn = await mongoose.createConnection(handle.uri).asPromise();
    await conn.dropDatabase();
    await conn.close();
});

describe('seedShop', () => {
    it('inserts a Shop with default `nordcom-demo-shop.com` shape', async () => {
        await seedShop(handle.uri);

        const conn = await mongoose.createConnection(handle.uri).asPromise();
        const shop = await conn.collection('shops').findOne({ domain: 'nordcom-demo-shop.com' });
        expect(shop).toBeTruthy();
        expect(shop?.i18n.defaultLocale).toBe('en-US');
        expect(shop?.commerceProvider.type).toBe('shopify');
        await conn.close();
    });

    it('honours overrides', async () => {
        await seedShop(handle.uri, { domain: 'other.example', name: 'Other Shop' });
        const conn = await mongoose.createConnection(handle.uri).asPromise();
        const shop = await conn.collection('shops').findOne({ domain: 'other.example' });
        expect(shop?.name).toBe('Other Shop');
        await conn.close();
    });

    it('is idempotent — second call with the same domain is a no-op', async () => {
        await seedShop(handle.uri);
        await seedShop(handle.uri);
        const conn = await mongoose.createConnection(handle.uri).asPromise();
        const count = await conn.collection('shops').countDocuments({ domain: 'nordcom-demo-shop.com' });
        expect(count).toBe(1);
        await conn.close();
    });
});
