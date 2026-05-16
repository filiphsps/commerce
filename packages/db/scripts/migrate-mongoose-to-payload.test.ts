// NOTE: This test requires MongoDB to be running locally. It will time out / fail
// in environments without a MongoDB at MONGODB_URI_TEST or localhost. Skip with
// `it.skipIf(!process.env.MONGODB_URI && !process.env.MONGODB_URI_TEST)` if needed.

import { bootTestPayload, type TestPayload } from '@nordcom/commerce-cms/test-utils';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FeatureFlagModel as TFeatureFlagModel, ShopModel as TShopModel } from '../src/models';
import type {
    migrateFeatureFlags as TMigrateFeatureFlags,
    migrateShops as TMigrateShops,
} from './migrate-mongoose-to-payload';

// Integration tests only run when a dedicated test database URI is provided.
// MONGODB_URI is a prod URI (and vitest.setup.ts overrides it to localhost);
// MONGODB_URI_TEST is the explicit signal that a reachable test DB exists.
const skipIfNoMongo = !process.env.MONGODB_URI_TEST;

describe.skipIf(skipIfNoMongo)('migrate-mongoose-to-payload (integration)', () => {
    let testPayload: TestPayload;
    let ShopModel: typeof TShopModel;
    let FeatureFlagModel: typeof TFeatureFlagModel;
    let migrateShops: typeof TMigrateShops;
    let migrateFeatureFlags: typeof TMigrateFeatureFlags;

    beforeAll(async () => {
        // Guard: describe.skipIf marks tests as skipped but beforeAll still fires
        // in Vitest 4.x. Return early so no Mongoose connection is attempted.
        if (skipIfNoMongo) return;

        // Dynamic imports so the Mongoose connection only fires when MongoDB is
        // reachable — static imports would connect at module-load time, before
        // describe.skipIf can suppress the suite.
        const models = await import('../src/models');
        ShopModel = models.ShopModel;
        FeatureFlagModel = models.FeatureFlagModel;

        const migrationModule = await import('./migrate-mongoose-to-payload');
        migrateShops = migrationModule.migrateShops;
        migrateFeatureFlags = migrationModule.migrateFeatureFlags;

        testPayload = await bootTestPayload({ suite: 'migrate' });
    }, 60_000);

    afterAll(async () => {
        if (testPayload) await testPayload.teardown();
    });

    beforeEach(async () => {
        await ShopModel.deleteMany({});
        await FeatureFlagModel.deleteMany({});
        await testPayload.instance.delete({ collection: 'shops' as never, where: {} as never, overrideAccess: true });
        await testPayload.instance.delete({
            collection: 'feature-flags' as never,
            where: {} as never,
            overrideAccess: true,
        });
    });

    describe('migrateShops', () => {
        it('copies a Mongoose Shop into the Payload shops collection', async () => {
            await ShopModel.create({
                name: 'Acme',
                domain: 'acme.test',
                design: { header: { logo: { src: '/', alt: '', width: 1, height: 1 } }, accents: [] },
                commerceProvider: {
                    type: 'shopify',
                    authentication: { publicToken: 'pt' },
                    storefrontId: 's',
                    domain: 'a',
                    id: 'cp',
                },
                contentProvider: { type: 'cms' },
            });
            const result = await migrateShops(testPayload.instance);
            expect(result.migrated).toBe(1);
            expect(result.skipped).toBe(0);

            const { docs } = await testPayload.instance.find({
                collection: 'shops' as never,
                where: { domain: { equals: 'acme.test' } } as never,
                overrideAccess: true,
            });
            expect(docs).toHaveLength(1);
        });

        it('is idempotent: running twice does not duplicate', async () => {
            await ShopModel.create({
                name: 'Acme',
                domain: 'acme.test',
                design: { header: { logo: { src: '/', alt: '', width: 1, height: 1 } }, accents: [] },
                commerceProvider: {
                    type: 'shopify',
                    authentication: { publicToken: 'pt' },
                    storefrontId: 's',
                    domain: 'a',
                    id: 'cp',
                },
                contentProvider: { type: 'cms' },
            });
            await migrateShops(testPayload.instance);
            const second = await migrateShops(testPayload.instance);
            expect(second.migrated).toBe(0);
            expect(second.skipped).toBe(1);
        });
    });

    describe('migrateFeatureFlags', () => {
        it('copies key + defaultValue + targeting', async () => {
            await FeatureFlagModel.create({
                key: 'my-flag',
                defaultValue: true,
                targeting: [{ rule: 'r', params: {}, value: true }],
            });
            const result = await migrateFeatureFlags(testPayload.instance);
            expect(result.migrated).toBe(1);

            const { docs } = await testPayload.instance.find({
                collection: 'feature-flags' as never,
                where: { key: { equals: 'my-flag' } } as never,
                overrideAccess: true,
            });
            expect(docs).toHaveLength(1);
        });
    });
});
