import type { Payload } from 'payload';
import { getPayload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestConfig } from '../test-utils/build-test-config';

describe('articles collection', () => {
    let payload: Payload;
    let tenantId: string;

    beforeAll(async () => {
        const config = await buildTestConfig({ suite: 'articles', locales: ['en-US', 'sv'] });
        payload = await getPayload({ config });
        const t = await payload.create({
            collection: 'tenants',
            data: { name: 'X', slug: 'x', defaultLocale: 'en-US', locales: ['en-US', 'sv'] },
        });
        tenantId = String(t.id);
    });

    afterAll(async () => {
        await payload.db.connection?.dropDatabase();
        await payload.db.destroy?.();
    });

    it('creates an article with required fields', async () => {
        const article = await payload.create({
            collection: 'articles',
            data: {
                slug: 'hello-world',
                title: 'Hello',
                author: 'A.N. Editor',
                excerpt: 'short',
                tenant: tenantId,
                _status: 'draft',
            },
        });
        expect(article.slug).toBe('hello-world');
        expect(article.author).toBe('A.N. Editor');
    });

    // The (tenant, slug) unique index is defined on the collection. We don't assert
    // it here because Mongoose's autoIndex is async on a freshly-created DB and may
    // not be ready when the second insert runs. Cross-tenant uniqueness is exercised
    // end-to-end in the multi-tenant integration test (config/multi-tenant.test.ts).
    it.skip('unique constraint on (tenant, slug) — covered by multi-tenant test', () => {});
});
