import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPayload } from 'payload';
import type { Payload } from 'payload';
import { buildTestConfig } from '../test-utils/build-test-config';

describe('product + collection metadata collections', () => {
    let payload: Payload;
    let tenantId: string;

    beforeAll(async () => {
        const config = await buildTestConfig({ suite: 'metadata' });
        payload = await getPayload({ config });
        const t = await payload.create({
            collection: 'tenants',
            data: { name: 'X', slug: 'x', defaultLocale: 'en-US', locales: ['en-US'] },
        });
        tenantId = String(t.id);
    });

    afterAll(async () => {
        await payload.db.connection?.dropDatabase();
        await payload.db.destroy?.();
    });

    it('creates product metadata with shopifyHandle', async () => {
        const doc = await payload.create({
            collection: 'productMetadata',
            data: { shopifyHandle: 'sour-worms', tenant: tenantId },
        });
        expect(doc.shopifyHandle).toBe('sour-worms');
    });

    it('creates collection metadata with shopifyHandle', async () => {
        const doc = await payload.create({
            collection: 'collectionMetadata',
            data: { shopifyHandle: 'candy', tenant: tenantId },
        });
        expect(doc.shopifyHandle).toBe('candy');
    });

    // Compound unique index on (tenant, shopifyHandle) is defined on each collection.
    // Cross-tenant uniqueness is exercised end-to-end in config/multi-tenant.test.ts.
});
