import { makeFunctionReference } from 'convex/server';
import { ConvexError } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Id } from '../_generated/dataModel';
import schema from '../schema';
import { CmsAccessErrorCode } from './access';
import { CmsActionErrorCode } from './actions';
import { CmsDocumentErrorCode } from './documents';

/**
 * The trusted Clerk operator issuer the tenant constructors assert against (via the resolveActiveAdminShopId chain),
 * stubbed into `CLERK_FRONTEND_API_URL` so the issuer check is active under `convex-test`, whose
 * `withIdentity` fakes identities WITHOUT Convex's real signature/issuer validation.
 */
const TRUSTED_ISSUER = 'https://admin.test.nordcom.io';

/**
 * A fixed epoch-ms stamp for seeded rows' managed timestamps; its value only has to satisfy the
 * numeric timestamp validators.
 */
const NOW = 1_700_000_000_000;

/**
 * Module map for `convex-test`: the editor actions plus the document/version mutations they
 * delegate to in-transaction, so every `FunctionReference` resolves and runs end to end. The dummy
 * `_generated` key only anchors convex-test's `/convex/` module-root detection (see
 * `cms/access.test.ts`). `revalidate/onPublish` is deliberately ABSENT — publishes only SCHEDULE
 * it, and these tests assert the schedule rows rather than executing them.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/cms/actions.ts': () => import('./actions'),
    '/convex/cms/documents.ts': () => import('./documents'),
    '/convex/cms/versions.ts': () => import('./versions'),
};

const saveDraftRef = makeFunctionReference<'mutation'>('cms/actions:saveDraft');
const publishRef = makeFunctionReference<'mutation'>('cms/actions:publish');
const createRef = makeFunctionReference<'mutation'>('cms/actions:create');
const deleteRef = makeFunctionReference<'mutation'>('cms/actions:deleteDocument');
const bulkDeleteRef = makeFunctionReference<'mutation'>('cms/actions:bulkDelete');
const bulkPublishRef = makeFunctionReference<'mutation'>('cms/actions:bulkPublish');
const restoreRef = makeFunctionReference<'mutation'>('cms/actions:restoreVersion');

/**
 * Seeds an isolated tenant — one operator user, one shop, and a collaborator linking them —
 * through convex-test's raw `t.run` ctx (the unscoped path for platform-global `users`/`shops`).
 *
 * @param t - The convex-test harness.
 * @param email - The operator's identity email (the claim `resolveAdminShopId` resolves from).
 * @param legacyId - The shop's legacy id/display name and primary domain seed.
 * @param permissions - The collaborator grants; `['admin']` resolves the `admin` role, anything
 *   else resolves `editor`.
 * @returns The seeded `shops` id.
 */
async function seedTenant(
    t: ReturnType<typeof convexTest>,
    email: string,
    legacyId: string,
    permissions: string[] = ['admin'],
): Promise<Id<'shops'>> {
    return t.run(async (ctx) => {
        const userId = await ctx.db.insert('users', {
            email,
            name: 'Operator',
            emailVerified: null,
            identities: [],
            createdAt: NOW,
            updatedAt: NOW,
        });
        const shopId = await ctx.db.insert('shops', {
            legacyId,
            name: legacyId,
            domain: `${legacyId}.example.com`,
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: legacyId } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: NOW,
            updatedAt: NOW,
        });
        await ctx.db.insert('shopCollaborators', { shop: shopId, user: userId, permissions });
        return shopId;
    });
}

/**
 * Collects the `_scheduled_functions` rows the harness has recorded — the post-commit work a
 * mutation armed. The draft-path assertions pin this to ZERO (CMSDATA-05's no-notify contract);
 * the publish-path assertions pin exactly one `revalidate/onPublish:onPublish` per publish.
 *
 * @param t - The convex-test harness.
 * @returns The scheduled-function system rows.
 */
async function scheduledFunctions(t: ReturnType<typeof convexTest>) {
    return t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect());
}

/**
 * Unwraps the `ConvexError` payload code from a rejected mutation, so denial tests assert the
 * stable cause instead of string-matching messages.
 *
 * @param promise - The mutation call expected to reject.
 * @returns The `data.code` carried by the thrown `ConvexError`.
 */
async function rejectionCode(promise: Promise<unknown>): Promise<string> {
    const error = await promise.then(
        () => {
            throw new TypeError('Expected the mutation to reject.');
        },
        (cause: unknown) => cause,
    );
    expect(error).toBeInstanceOf(ConvexError);
    return (error as ConvexError<{ code: string }>).data.code;
}

beforeEach(() => {
    vi.stubEnv('CLERK_FRONTEND_API_URL', TRUSTED_ISSUER);
    // Frozen timers keep every `runAfter(0, …)` schedule PENDING (the same pattern as
    // `revalidate/onPublish.test.ts`), so the assertions read the armed `_scheduled_functions`
    // rows instead of racing their execution — these tests pin WHAT was scheduled, never run it.
    vi.useFakeTimers({ now: NOW });
});
afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
});

describe('cms editor actions — draft path schedules nothing', () => {
    it('create births a draft with one version and zero scheduled work', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const created = await asA.mutation(createRef, { collection: 'pages', data: { title: '' } });
        const live = await t.run((ctx) => ctx.db.get(created.documentId));
        expect(live?.status).toBe('draft');
        expect(live?.latestVersionId).toBe(created.versionId);

        expect(await scheduledFunctions(t)).toHaveLength(0);
    });

    it('saveDraft autosave ticks update the same doc, append versions, and never schedule notify', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const created = await asA.mutation(createRef, { collection: 'pages', data: { title: 'v1' } });
        const tick = await asA.mutation(saveDraftRef, {
            collection: 'pages',
            documentId: created.documentId,
            data: { title: 'v2' },
        });
        expect(tick.documentId).toBe(created.documentId);

        const live = await t.run((ctx) => ctx.db.get(created.documentId));
        expect((live?.data as { title: string }).title).toBe('v2');
        expect(live?.status).toBe('draft');

        const versions = await t.run((ctx) => ctx.db.query('cmsVersions').collect());
        expect(versions.filter((row) => row.documentId === created.documentId)).toHaveLength(2);

        // The CMSDATA-05 contract: a draft/autosave save arms ZERO revalidation work.
        expect(await scheduledFunctions(t)).toHaveLength(0);
    });

    it('saveDraft with no target upserts the tenant singleton instead of inserting per tick', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const first = await asA.mutation(saveDraftRef, { collection: 'header', data: { announcements: [] } });
        const second = await asA.mutation(saveDraftRef, { collection: 'header', data: { announcements: ['hi'] } });
        expect(second.documentId).toBe(first.documentId);

        const docs = await t.run((ctx) => ctx.db.query('cmsDocuments').collect());
        expect(docs).toHaveLength(1);
    });

    it('saveDraft addresses keyed collections by keyField/keyValue', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const first = await asA.mutation(saveDraftRef, {
            collection: 'productMetadata',
            keyField: 'shopifyHandle',
            keyValue: 'hat',
            data: { shopifyHandle: 'hat', seoTitle: 'Hat' },
        });
        const second = await asA.mutation(saveDraftRef, {
            collection: 'productMetadata',
            keyField: 'shopifyHandle',
            keyValue: 'hat',
            data: { shopifyHandle: 'hat', seoTitle: 'Better hat' },
        });
        expect(second.documentId).toBe(first.documentId);

        // A different key is a different document.
        const other = await asA.mutation(saveDraftRef, {
            collection: 'productMetadata',
            keyField: 'shopifyHandle',
            keyValue: 'cap',
            data: { shopifyHandle: 'cap' },
        });
        expect(other.documentId).not.toBe(first.documentId);
    });

    it('rejects a half-specified key target', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        expect(
            await rejectionCode(
                asA.mutation(saveDraftRef, { collection: 'pages', keyField: 'slug', data: { slug: 's' } }),
            ),
        ).toBe(CmsActionErrorCode.INVALID_DOCUMENT_TARGET);
    });
});

describe('cms editor actions — publish path', () => {
    it('publish flips the doc live and schedules exactly one onPublish hook', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const created = await asA.mutation(createRef, { collection: 'pages', data: { title: 'Hi', slug: 'hi' } });
        await asA.mutation(publishRef, {
            collection: 'pages',
            documentId: created.documentId,
            data: { title: 'Hi', slug: 'hi' },
        });

        const live = await t.run((ctx) => ctx.db.get(created.documentId));
        expect(live?.status).toBe('published');

        const scheduled = await scheduledFunctions(t);
        expect(scheduled).toHaveLength(1);
        expect(scheduled[0]?.name).toBe('revalidate/onPublish:onPublish');
    });

    it('publish enforces the server-trusted required-field contract', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const created = await asA.mutation(createRef, { collection: 'pages', data: { title: '' } });
        expect(
            await rejectionCode(
                asA.mutation(publishRef, { collection: 'pages', documentId: created.documentId, data: { title: '' } }),
            ),
        ).toBe(CmsDocumentErrorCode.REQUIRED_FIELD_MISSING);
        expect(await scheduledFunctions(t)).toHaveLength(0);
    });

    it('bulkPublish publishes every doc with its own snapshot and onPublish schedule', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const one = await asA.mutation(createRef, { collection: 'pages', data: { title: 'One', slug: 'one' } });
        const two = await asA.mutation(createRef, { collection: 'pages', data: { title: 'Two', slug: 'two' } });

        await asA.mutation(bulkPublishRef, { documentIds: [one.documentId, two.documentId] });

        const docs = await t.run((ctx) => ctx.db.query('cmsDocuments').collect());
        expect(docs.map((doc) => doc.status)).toEqual(['published', 'published']);

        const scheduled = await scheduledFunctions(t);
        expect(scheduled).toHaveLength(2);
        expect(scheduled.every((row) => row.name === 'revalidate/onPublish:onPublish')).toBe(true);
    });

    it('bulkPublish rolls the whole batch back when one doc is unpublishable', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const valid = await asA.mutation(createRef, { collection: 'pages', data: { title: 'Ok', slug: 'ok' } });
        const invalid = await asA.mutation(createRef, { collection: 'pages', data: { title: '' } });

        expect(
            await rejectionCode(asA.mutation(bulkPublishRef, { documentIds: [valid.documentId, invalid.documentId] })),
        ).toBe(CmsDocumentErrorCode.REQUIRED_FIELD_MISSING);

        const liveValid = await t.run((ctx) => ctx.db.get(valid.documentId));
        // Atomicity: the valid doc's publish rolled back with the batch.
        expect(liveValid?.status).toBe('draft');
        expect(await scheduledFunctions(t)).toHaveLength(0);
    });
});

describe('cms editor actions — delete path', () => {
    it('deleteDocument removes the live row and its whole history', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const created = await asA.mutation(createRef, { collection: 'pages', data: { title: 'Bye', slug: 'bye' } });
        await asA.mutation(saveDraftRef, {
            collection: 'pages',
            documentId: created.documentId,
            data: { title: 'Bye 2', slug: 'bye' },
        });

        await asA.mutation(deleteRef, { documentId: created.documentId });

        expect(await t.run((ctx) => ctx.db.get(created.documentId))).toBeNull();
        expect(await t.run((ctx) => ctx.db.query('cmsVersions').collect())).toHaveLength(0);
    });

    it('bulkDelete removes every doc atomically and fails closed on a foreign id', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        await seedTenant(t, 'op@b.example.com', 'shop_b');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });
        const asB = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|b', email: 'op@b.example.com' });

        const one = await asA.mutation(createRef, { collection: 'pages', data: { title: 'One' } });
        const two = await asA.mutation(createRef, { collection: 'pages', data: { title: 'Two' } });
        const foreign = await asB.mutation(createRef, { collection: 'pages', data: { title: 'B doc' } });

        // A's bulk including B's doc fails closed (RLS hides it) and rolls the whole batch back.
        expect(
            await rejectionCode(asA.mutation(bulkDeleteRef, { documentIds: [one.documentId, foreign.documentId] })),
        ).toBe(CmsDocumentErrorCode.DOCUMENT_NOT_FOUND);
        expect(await t.run((ctx) => ctx.db.get(one.documentId))).not.toBeNull();

        await asA.mutation(bulkDeleteRef, { documentIds: [one.documentId, two.documentId] });
        expect(await t.run((ctx) => ctx.db.get(one.documentId))).toBeNull();
        expect(await t.run((ctx) => ctx.db.get(two.documentId))).toBeNull();
        expect(await t.run((ctx) => ctx.db.get(foreign.documentId))).not.toBeNull();
    });
});

describe('cms editor actions — restoreVersion', () => {
    it('re-materializes a prior snapshot as a fresh draft without scheduling notify', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const v1 = await asA.mutation(createRef, { collection: 'pages', data: { title: 'original', slug: 'o' } });
        await asA.mutation(publishRef, {
            collection: 'pages',
            documentId: v1.documentId,
            data: { title: 'replacement', slug: 'o' },
        });
        const scheduledAfterPublish = (await scheduledFunctions(t)).length;

        const restored = await asA.mutation(restoreRef, { versionId: v1.versionId });
        expect(restored.documentId).toBe(v1.documentId);

        const live = await t.run((ctx) => ctx.db.get(v1.documentId));
        expect((live?.data as { title: string }).title).toBe('original');
        // The restore re-materializes into the WORKING DRAFT only — the published snapshot (and
        // the derived status) stay pinned, so the storefront keeps serving the publish (G4FIX-01).
        expect(live?.status).toBe('published');

        // A restore lands as a draft, so it arms no additional revalidation work.
        expect(await scheduledFunctions(t)).toHaveLength(scheduledAfterPublish);
    });

    it('fails closed on another tenant version', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        await seedTenant(t, 'op@b.example.com', 'shop_b');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });
        const asB = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|b', email: 'op@b.example.com' });

        const v1 = await asA.mutation(createRef, { collection: 'pages', data: { title: 't' } });
        await expect(asB.mutation(restoreRef, { versionId: v1.versionId })).rejects.toThrow(ConvexError);
    });
});

describe('cms editor actions — the CMSGATE-02 publish race (G4FIX-01)', () => {
    it('a stale in-flight saveDraft arriving after publish cannot revert the doc to draft', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        // The editor branches from the first draft tick…
        const base = await asA.mutation(createRef, { collection: 'pages', data: { title: 'WIP', slug: 'race' } });
        // …the operator publishes…
        const published = await asA.mutation(publishRef, {
            collection: 'pages',
            documentId: base.documentId,
            data: { title: 'Live title', slug: 'race' },
        });
        // …and THEN the diverged autosave crafted before the publish lands.
        const stale = await asA.mutation(saveDraftRef, {
            collection: 'pages',
            documentId: base.documentId,
            data: { title: 'WIP again', slug: 'race' },
            baseVersionId: base.versionId,
        });

        // Merge-forward: the payload became the working draft, flagged as superseded, while the
        // published state (status + snapshot pointer) is untouched — the doc was NOT reverted.
        expect(stale.conflict).toBe('publish-superseded-base');
        const live = await t.run((ctx) => ctx.db.get(base.documentId));
        expect(live?.status).toBe('published');
        expect(live?.publishedVersionId).toBe(published.versionId);
        expect((live?.data as { title: string }).title).toBe('WIP again');

        // A follow-up draft based on the publish (the rebased editor) carries no marker.
        const rebased = await asA.mutation(saveDraftRef, {
            collection: 'pages',
            documentId: base.documentId,
            data: { title: 'Post-publish draft', slug: 'race' },
            baseVersionId: published.versionId,
        });
        expect(rebased.conflict).toBeUndefined();
    });
});

describe('cms editor actions — access enforcement (no overrideAccess escape)', () => {
    it('an editor collaborator can draft and publish but never delete', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'editor@a.example.com', 'shop_a', ['write']);
        const asEditor = t.withIdentity({
            issuer: TRUSTED_ISSUER,
            subject: 'github|e',
            email: 'editor@a.example.com',
        });

        const created = await asEditor.mutation(createRef, { collection: 'pages', data: { title: 'E', slug: 'e' } });
        await asEditor.mutation(publishRef, {
            collection: 'pages',
            documentId: created.documentId,
            data: { title: 'E', slug: 'e' },
        });

        expect(await rejectionCode(asEditor.mutation(deleteRef, { documentId: created.documentId }))).toBe(
            CmsAccessErrorCode.ADMIN_REQUIRED,
        );
        expect(await rejectionCode(asEditor.mutation(bulkDeleteRef, { documentIds: [created.documentId] }))).toBe(
            CmsAccessErrorCode.ADMIN_REQUIRED,
        );
        expect(await t.run((ctx) => ctx.db.get(created.documentId))).not.toBeNull();
    });

    it('an unauthenticated caller is rejected before any write', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');

        await expect(t.mutation(createRef, { collection: 'pages', data: {} })).rejects.toThrow(ConvexError);
        expect(await t.run((ctx) => ctx.db.query('cmsDocuments').collect())).toHaveLength(0);
    });

    it('a tenant cannot draft onto another tenant document', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        await seedTenant(t, 'op@b.example.com', 'shop_b');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });
        const asB = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|b', email: 'op@b.example.com' });

        const aDoc = await asA.mutation(createRef, { collection: 'pages', data: { title: 'A' } });
        expect(
            await rejectionCode(
                asB.mutation(saveDraftRef, { collection: 'pages', documentId: aDoc.documentId, data: { title: 'X' } }),
            ),
        ).toBe(CmsDocumentErrorCode.DOCUMENT_NOT_FOUND);

        const live = await t.run((ctx) => ctx.db.get(aDoc.documentId));
        expect((live?.data as { title: string }).title).toBe('A');
    });
});
