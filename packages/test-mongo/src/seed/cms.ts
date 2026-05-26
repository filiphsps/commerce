import { createConnection, Types } from 'mongoose';

export interface SeedCmsOptions {
    tenantId: string;
}

/**
 * Resets and re-creates the canonical CMS docs for the given tenant.
 *
 * Mirrors the contract of the old `apps/storefront/e2e/fixtures/seed-cms.ts`:
 * one Header, one Footer, one BusinessData, one Page (`/about`), one Article.
 *
 * # Deviation from the plan
 *
 * The plan called for `getPayloadInstance` from `@nordcom/commerce-cms/api`.
 * Booting a real Payload instance against MMS in Vitest hit three structural
 * issues, in order of how they surface:
 *
 *  1. `@nordcom/commerce-cms/config` statically imports `@payloadcms/storage-s3`,
 *     which drags in `@aws-sdk/client-s3` → `@smithy/core`. The latter's
 *     `dist-es/submodules/protocols/index.js` uses extensionless relative
 *     imports that Node's strict ESM resolver rejects with `MODULE_NOT_FOUND`
 *     when Vitest externalizes the package. `vi.mock(...)` does not intercept
 *     transitive imports nested inside workspace dist files. A `resolve.alias`
 *     in `vitest.config.ts` swaps the package for a `data:` URL no-op, which
 *     unblocks resolution.
 *  2. Booting Payload, then running 5 deletes + 5 creates in sequence against
 *     a 1-node MMS replica set hits `WriteConflict` / `LockTimeout` errors on
 *     `payload-preferences` because Payload wraps every operation in a
 *     transaction and MMS's 5ms IX lock timeout can't accommodate the catalog
 *     work Payload does on a fresh DB. `mongooseAdapter`'s
 *     `transactionOptions: false` would fix this, but `getPayloadInstance` →
 *     `buildPayloadConfig` doesn't expose that knob.
 *  3. Even if (1) and (2) were resolved, the collection-level `afterChange`
 *     hooks call `revalidateTag` from `next/cache`, which throws
 *     `Invariant: static generation store missing` outside a Next.js render
 *     context — there's no way to run those hooks under Vitest.
 *
 * The seed writes documents directly via mongoose using ObjectId references
 * for `tenant`, matching what Payload would produce. This matches the
 * `seedShop` pattern (also mongoose-direct) and preserves the contract: the
 * storefront's `@nordcom/commerce-cms/api` reads find the docs by tenant +
 * slug exactly the same way they would in production.
 */
export async function seedCms(uri: string, { tenantId }: SeedCmsOptions): Promise<void> {
    if (!process.env.MONGODB_URI) process.env.MONGODB_URI = uri;
    const tenant = new Types.ObjectId(tenantId);
    const conn = await createConnection(uri, { bufferCommands: false }).asPromise();
    try {
        const collections = ['header', 'footer', 'businessData', 'pages', 'articles'] as const;
        for (const name of collections) {
            await conn.collection(name).deleteMany({ tenant });
        }

        const now = new Date();

        await conn.collection('header').insertOne({
            tenant,
            logoLink: '/',
            // Mirrors the shape of `topLevelNavItemField` in
            // packages/cms/src/fields/nav-item.ts — `variant` ∈
            // { 'editorial-columns', 'compact-list', 'featured-promo' }.
            items: [
                {
                    link: { kind: 'external', label: 'Editorial', url: '/editorial', openInNewTab: false },
                    variant: 'editorial-columns',
                    items: [{ link: { kind: 'external', label: 'Sub 1', url: '/sub-1', openInNewTab: false } }],
                },
                {
                    link: { kind: 'external', label: 'Compact', url: '/compact', openInNewTab: false },
                    variant: 'compact-list',
                    items: [{ link: { kind: 'external', label: 'About', url: '/about', openInNewTab: false } }],
                },
                {
                    link: { kind: 'external', label: 'Featured', url: '/featured', openInNewTab: false },
                    variant: 'featured-promo',
                    items: [{ link: { kind: 'external', label: 'See all', url: '/all', openInNewTab: false } }],
                },
            ],
            _status: 'published',
            createdAt: now,
            updatedAt: now,
        });

        await conn.collection('footer').insertOne({
            tenant,
            sections: [],
            social: [],
            legal: [],
            _status: 'published',
            createdAt: now,
            updatedAt: now,
        });

        await conn.collection('businessData').insertOne({
            tenant,
            legalName: 'Nordcom Demo Shop Ltd.',
            supportEmail: 'hello@nordcom-demo-shop.example.com',
            _status: 'published',
            createdAt: now,
            updatedAt: now,
        });

        await conn.collection('pages').insertOne({
            tenant,
            slug: 'about',
            title: 'About',
            _status: 'published',
            createdAt: now,
            updatedAt: now,
        });

        // `articles` requires `author` per packages/cms/src/collections/articles.ts.
        await conn.collection('articles').insertOne({
            tenant,
            slug: 'hello-world',
            title: 'Hello world',
            author: 'Seed',
            _status: 'published',
            createdAt: now,
            updatedAt: now,
        });
    } finally {
        await conn.close();
    }
}
