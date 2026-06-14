import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import schema from '../../../convex/convex/schema';
import { seedCanonicalMutation } from './canonical';

const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
};

/** Static bridge: convex-test's loosely-typed ctx → the precisely-typed seed mutation ctx. */
function asSeedCtx(ctx: unknown): Parameters<typeof seedCanonicalMutation>[0] {
    return ctx as Parameters<typeof seedCanonicalMutation>[0];
}

describe('seeded CMS version history', () => {
    it('gives a page a published baseline + a working draft with wired pointers', async () => {
        const t = convexTest(schema, modules);
        await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));

        const docs = await t.run((ctx) => ctx.db.query('cmsDocuments').collect());
        const withHistory = docs.find((d) => d.publishedVersionId && d.latestVersionId);
        expect(withHistory).toBeTruthy();

        const versions = await t.run((ctx) => ctx.db.query('cmsVersions').collect());
        const docVersions = versions.filter((v) => v.documentId === withHistory?._id);
        expect(docVersions.length).toBeGreaterThanOrEqual(2);
        expect(docVersions.some((v) => v.status === 'published')).toBe(true);
        expect(docVersions.some((v) => v.status === 'draft')).toBe(true);
    });

    it('is idempotent — a second run does not add more versions', async () => {
        const t = convexTest(schema, modules);
        await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));
        const before = await t.run((ctx) => ctx.db.query('cmsVersions').collect());
        await t.run((ctx) => seedCanonicalMutation(asSeedCtx(ctx)));
        const after = await t.run((ctx) => ctx.db.query('cmsVersions').collect());
        expect(after.length).toBe(before.length);
    });
});
