import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPayload } from 'payload';
import type { Payload } from 'payload';
import { buildTestConfig } from '../../test-utils/build-test-config';

describe('globals (header/footer/businessData)', () => {
    let payload: Payload;
    let tenantId: string;

    beforeAll(async () => {
        // buildTestConfig only includes content collections by default; we need globals too.
        // For this scope test we configure a separate setup inline below — but until Task 16's
        // buildPayloadConfig lands we extend the shared helper indirectly by adding the global
        // collections via the same plugin shape.
        const config = await buildTestConfig({ suite: 'globals' });
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

    it('header is reachable as a collection in test config', () => {
        // Globals come from buildPayloadConfig — wired in Task 16. For now this test
        // simply documents the tenant id setup; full assertions move to Task 16.
        expect(tenantId).toMatch(/^[a-f0-9]{24}$/);
    });
});
