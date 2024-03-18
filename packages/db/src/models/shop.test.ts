import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { MongoMemoryServer } from 'mongodb-memory-server';
import { db } from '../db';
import { Shop } from './shop';

describe('models', () => {
    describe('shop', () => {
        let mongod: MongoMemoryServer;

        beforeAll(async () => {
            mongod = await MongoMemoryServer.create();
            vi.stubEnv('MONGODB_URI', mongod.getUri());
        });
        afterAll(() => {
            db()
                .then((db) => db.disconnect())
                .then(() => mongod.stop());
        }, 1000);

        it('initializes the ShopModel', async () => {
            const instance = await db();
            const shop = Shop(instance);

            expect(instance.models.Shop).toBeDefined();
            expect(instance.models.Shop).toEqual(shop);
        });

        it('should create a Shop', async () => {
            const doc = await db()
                .then(Shop)
                .then((shop) =>
                    shop.create({
                        name: 'Test Shop',
                        domain: 'test-shop.com'
                    })
                );

            expect(doc).toMatchObject({
                name: 'Test Shop',
                domain: 'test-shop.com'
            });
        });

        it.skip('should not allow duplicate domains', async () => {
            const shop = Shop(await db());

            await shop.create({
                name: 'Shop 1',
                domain: 'test-domain.com'
            });

            await expect(
                shop.create({
                    name: 'Shop 2',
                    domain: 'test-domain.com'
                })
            ).rejects.toThrow('E11000 duplicate key error collection');
        });
    });
});
