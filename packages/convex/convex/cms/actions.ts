import type { GenericMutationCtx } from 'convex/server';
import { ConvexError, v } from 'convex/values';

import { api, internal } from '../_generated/api';
import type { DataModel, Id } from '../_generated/dataModel';
import { BoundedScanExceededError, SCAN_BYTE_BUDGET, SCAN_DOCUMENT_BUDGET } from '../lib/scan_budget';
import { systemQuery } from '../lib/system';
import { tenantMutation } from '../lib/tenant';
import { assertAdmin, assertTenantScopedWrite, type CmsPrincipal, resolveCmsAuthContext } from './access';
import { CmsDocumentErrorCode } from './documents';

/**
 * Stable string codes carried on every {@link ConvexError} this module throws beyond the ones it
 * re-uses from `cms/documents.ts`/`cms/access.ts`, so call sites and `convex-test` branch on the
 * cause without string-matching messages — the sanctioned in-isolate error contract.
 */
export const CmsActionErrorCode = {
    /** A document target supplied `keyField` without `keyValue` (or vice versa) — unresolvable. */
    INVALID_DOCUMENT_TARGET: 'CMS_INVALID_DOCUMENT_TARGET',
} as const;

/**
 * The slice of the tenant mutation context the editor-action helpers operate over: the
 * server-pinned `shopId`, the RLS-wrapped writer, and the in-transaction sub-call surface.
 * Structural (rather than the constructor's inferred ctx) so the helpers stay callable from every
 * action without re-deriving the custom-function context type.
 */
type EditorActionCtx = Pick<GenericMutationCtx<DataModel>, 'db' | 'runQuery' | 'runMutation'> & {
    shopId: Id<'shops'>;
};

/**
 * The result shape `cms/documents.ts`'s `save` returns, re-stated here as an explicit annotation on
 * every action handler. The annotation is load-bearing: these actions call back into the generated
 * `api` object from inside the same function tree, and without an explicit return type TypeScript's
 * inference for `api` becomes self-referential.
 */
type SaveResult = { documentId: Id<'cmsDocuments'>; versionId: Id<'cmsVersions'> };

/**
 * Resolves the CMS principal backing the request's trusted identity for the active shop.
 *
 * INTERNAL-only (built on {@link systemQuery}) because `resolveCmsAuthContext` must read the
 * rule-less platform `users` table and the cross-shop `shopCollaborators` rows with the RAW db —
 * under the tenant tier's deny-default RLS wrapper the email lookup would be denied and surface a
 * spurious `UNKNOWN_USER`. The tenant actions below reach it via `ctx.runQuery`, which runs in the
 * same transaction under the same validated auth identity, so the resolution stays server-trusted.
 *
 * @param ctx - The raw system query context (`auth` + un-wrapped `db`).
 * @param args - The active tenant whose collaborator row determines the role.
 * @returns The resolved CMS principal (role + collaborated tenant ids).
 * @throws {ConvexError} `UNAUTHENTICATED` / `FORGED_IDENTITY` / `IDENTITY_WITHOUT_EMAIL` /
 *   `UNKNOWN_USER` from `resolveUserFromIdentity`.
 */
export const principal = systemQuery({
    args: { shopId: v.id('shops') },
    handler: async (ctx, { shopId }): Promise<CmsPrincipal> => resolveCmsAuthContext(ctx, shopId),
});

/**
 * Resolves the caller's principal and enforces the tenant-scoped write predicate against the
 * active shop — the per-action CMSDATA-03 guard every editor mutation runs FIRST, layered over the
 * RLS deny-default (defense in depth, never a replacement). There is no client-controllable
 * `overrideAccess` escape: the guard is unconditional.
 *
 * @param ctx - The tenant action context (server-pinned `shopId`, sub-call surface).
 * @returns The resolved principal, for further role gates (e.g. {@link assertAdmin}).
 * @throws {ConvexError} `CMS_WRITE_FORBIDDEN` when the principal may not write this tenant; any
 *   auth-resolution failure from {@link principal}.
 */
async function requireWritePrincipal(ctx: EditorActionCtx): Promise<CmsPrincipal> {
    const who: CmsPrincipal = await ctx.runQuery(internal.cms.actions.principal, { shopId: ctx.shopId });
    assertTenantScopedWrite(who, { tenant: String(ctx.shopId) });
    return who;
}

/**
 * Resolves an editor-supplied document target to the tenant's live `cmsDocuments` id, or
 * `undefined` when no document exists yet (an upsert should create one).
 *
 * Three addressing modes, mirroring the editor manifests' route shapes:
 * - **`documentId`** — a literal `cmsDocuments` id; an unparseable id fails closed.
 * - **`keyField`/`keyValue`** — collections routed by a content key (e.g. `productMetadata` by
 *   `shopifyHandle`): the tenant's rows for the collection are streamed via `by_shop_collection`
 *   and matched on the serialized `data[keyField]`.
 * - **neither** — tenant singletons (`header`/`footer`/`businessData`): the tenant's single row
 *   for the collection IS the target, so an autosave loop upserts instead of inserting per tick.
 *
 * Reads go through the RLS-wrapped db, so another tenant's id/key resolves to nothing and the
 * write path downstream fails closed. The key scan is budgeted with the same ceilings as
 * `lib/scan_budget.ts` so a runaway collection fails typed before Convex's hard read limit.
 *
 * @param ctx - The tenant action context (RLS-wrapped `db`, server-pinned `shopId`).
 * @param target - The collection plus at most one addressing mode.
 * @returns The resolved live document id, or `undefined` when the save should create.
 * @throws {ConvexError} `CMS_DOCUMENT_NOT_FOUND` for an unparseable `documentId`;
 *   `CMS_INVALID_DOCUMENT_TARGET` when `keyField`/`keyValue` are not supplied as a pair.
 * @throws {BoundedScanExceededError} When the key scan crosses the document or byte budget.
 */
async function resolveTargetDocumentId(
    ctx: EditorActionCtx,
    target: { collection: string; documentId?: string; keyField?: string; keyValue?: string },
): Promise<Id<'cmsDocuments'> | undefined> {
    const { collection, documentId, keyField, keyValue } = target;
    if (documentId !== undefined) {
        const normalized = ctx.db.normalizeId('cmsDocuments', documentId);
        if (!normalized) {
            throw new ConvexError({
                code: CmsDocumentErrorCode.DOCUMENT_NOT_FOUND,
                message: 'No such document for this tenant.',
            });
        }
        return normalized;
    }
    if ((keyField === undefined) !== (keyValue === undefined)) {
        throw new ConvexError({
            code: CmsActionErrorCode.INVALID_DOCUMENT_TARGET,
            message: 'A keyed document target requires both keyField and keyValue.',
        });
    }

    let scanned = 0;
    let bytes = 0;
    const rows = ctx.db
        .query('cmsDocuments')
        .withIndex('by_shop_collection', (q) => q.eq('shopId', ctx.shopId).eq('collection', collection));
    for await (const doc of rows) {
        scanned += 1;
        bytes += JSON.stringify(doc)?.length ?? 0;
        if (scanned >= SCAN_DOCUMENT_BUDGET || bytes >= SCAN_BYTE_BUDGET) {
            throw new BoundedScanExceededError({
                scanned,
                documentBudget: SCAN_DOCUMENT_BUDGET,
                bytes,
                byteBudget: SCAN_BYTE_BUDGET,
            });
        }
        if (keyField === undefined) return doc._id;
        const record = (typeof doc.data === 'object' && doc.data !== null ? doc.data : {}) as Record<string, unknown>;
        if (record[keyField] === keyValue) return doc._id;
    }
    return undefined;
}

/**
 * Deletes one live document plus its entire version history, after the per-document guards: the
 * RLS-wrapped `get` hides cross-tenant rows (a foreign id reads as missing) and the tenant-scoped
 * write predicate re-checks the row's OWN `shopId` — the per-doc layer of the bulk paths.
 *
 * History collection is unbudgeted deliberately: it is one document's snapshots via
 * `by_document`, the same bounded shape `cms/versions.ts`'s `list` collects.
 *
 * @param ctx - The tenant action context (RLS-wrapped `db`).
 * @param who - The resolved principal performing the delete.
 * @param documentId - The live document to remove.
 * @throws {ConvexError} `CMS_DOCUMENT_NOT_FOUND` when the id is not visible to the tenant;
 *   `CMS_WRITE_FORBIDDEN` when the principal may not write the row's tenant.
 */
async function deleteDocumentRows(
    ctx: EditorActionCtx,
    who: CmsPrincipal,
    documentId: Id<'cmsDocuments'>,
): Promise<void> {
    const doc = await ctx.db.get(documentId);
    if (!doc) {
        throw new ConvexError({
            code: CmsDocumentErrorCode.DOCUMENT_NOT_FOUND,
            message: 'No such document for this tenant.',
        });
    }
    assertTenantScopedWrite(who, { tenant: String(doc.shopId) });

    const versions = await ctx.db
        .query('cmsVersions')
        .withIndex('by_document', (q) => q.eq('documentId', documentId))
        .collect();
    for (const version of versions) {
        await ctx.db.delete(version._id);
    }
    await ctx.db.delete(documentId);
}

/**
 * The shared argument validators for the draft/publish save actions: the target collection, the
 * serialized field map, and at most one document-addressing mode (see
 * {@link resolveTargetDocumentId}).
 */
const saveTargetArgs = {
    collection: v.string(),
    data: v.any(),
    documentId: v.optional(v.string()),
    keyField: v.optional(v.string()),
    keyValue: v.optional(v.string()),
};

/**
 * Editor `saveDraft` — the autosave/explicit-draft action. Enforces the tenant-scoped write guard,
 * resolves the document target (upserting singletons/keyed docs instead of inserting per tick), and
 * delegates to `cms/documents.ts`'s `save` with status `draft` in the SAME transaction, so the
 * required-field contract is skipped and — critically — ZERO revalidation is scheduled: the
 * publish-only `onPublish` hook never arms on a draft save.
 *
 * @param ctx - The tenant mutation context.
 * @param args - The collection, serialized `data`, and document target.
 * @returns The live `documentId` and the appended draft `versionId`.
 * @throws {ConvexError} `CMS_WRITE_FORBIDDEN` on access denial; `CMS_DOCUMENT_NOT_FOUND` for a
 *   target outside the tenant.
 */
export const saveDraft = tenantMutation({
    args: saveTargetArgs,
    handler: async (ctx, { collection, data, documentId, keyField, keyValue }): Promise<SaveResult> => {
        await requireWritePrincipal(ctx);
        const target = await resolveTargetDocumentId(ctx, { collection, documentId, keyField, keyValue });
        return await ctx.runMutation(api.cms.documents.save, {
            documentId: target,
            collection,
            data,
            status: 'draft',
        });
    },
});

/**
 * Editor `publish`. Same guard + target resolution as {@link saveDraft}, then delegates to
 * `cms/documents.ts`'s `save` with status `published`, so the server-trusted required-field
 * contract is enforced BEFORE any write and the BRIDGE-05 `onPublish` revalidation hook is
 * scheduled post-commit — the publish transition is the ONLY editor action that arms it.
 *
 * @param ctx - The tenant mutation context.
 * @param args - The collection, serialized `data`, and document target.
 * @returns The live `documentId` and the appended published `versionId`.
 * @throws {ConvexError} `CMS_WRITE_FORBIDDEN` on access denial; `CMS_REQUIRED_FIELD_MISSING` when a
 *   required field is empty; `CMS_DOCUMENT_NOT_FOUND` for a target outside the tenant.
 */
export const publish = tenantMutation({
    args: saveTargetArgs,
    handler: async (ctx, { collection, data, documentId, keyField, keyValue }): Promise<SaveResult> => {
        await requireWritePrincipal(ctx);
        const target = await resolveTargetDocumentId(ctx, { collection, documentId, keyField, keyValue });
        return await ctx.runMutation(api.cms.documents.save, {
            documentId: target,
            collection,
            data,
            status: 'published',
        });
    },
});

/**
 * Editor `create` — a brand-new document, born as a draft (the editor's create flow drops the user
 * into the edit view where autosave takes over). Enforces the tenant-scoped write guard, then
 * inserts via `cms/documents.ts`'s `save` with no target, so required fields may still be empty and
 * no revalidation is scheduled.
 *
 * @param ctx - The tenant mutation context.
 * @param args - The collection and the (possibly partial) serialized `data`.
 * @returns The new live `documentId` and its first draft `versionId`.
 * @throws {ConvexError} `CMS_WRITE_FORBIDDEN` on access denial.
 */
export const create = tenantMutation({
    args: { collection: v.string(), data: v.any() },
    handler: async (ctx, { collection, data }): Promise<SaveResult> => {
        await requireWritePrincipal(ctx);
        return await ctx.runMutation(api.cms.documents.save, { collection, data, status: 'draft' });
    },
});

/**
 * Editor `delete`. Layered guards: the tenant-scoped write predicate, the admin-only role gate
 * (delete is the operation editors must never perform on tenant-scoped content — the CMSDATA-03
 * `adminOnly` wiring), and the per-document checks in {@link deleteDocumentRows}. Removes the live
 * row AND its full version history; deletion schedules no revalidation (cache reconciliation is the
 * BRIDGE-07 replay's job).
 *
 * @param ctx - The tenant mutation context.
 * @param args - The live document to remove.
 * @throws {ConvexError} `CMS_WRITE_FORBIDDEN` / `CMS_ADMIN_REQUIRED` on access denial;
 *   `CMS_DOCUMENT_NOT_FOUND` when the id is not visible to the tenant.
 */
export const deleteDocument = tenantMutation({
    args: { documentId: v.id('cmsDocuments') },
    handler: async (ctx, { documentId }): Promise<void> => {
        const who = await requireWritePrincipal(ctx);
        assertAdmin(who);
        await deleteDocumentRows(ctx, who, documentId);
    },
});

/**
 * Editor `bulkDelete`. The same guard stack as {@link deleteDocument}, applied PER DOCUMENT, inside
 * one atomic mutation: any miss (a foreign or stale id) or denial rolls the whole batch back, so a
 * bulk action can never partially apply.
 *
 * @param ctx - The tenant mutation context.
 * @param args - The live documents to remove.
 * @throws {ConvexError} `CMS_WRITE_FORBIDDEN` / `CMS_ADMIN_REQUIRED` on access denial;
 *   `CMS_DOCUMENT_NOT_FOUND` when any id is not visible to the tenant.
 */
export const bulkDelete = tenantMutation({
    args: { documentIds: v.array(v.id('cmsDocuments')) },
    handler: async (ctx, { documentIds }): Promise<void> => {
        const who = await requireWritePrincipal(ctx);
        assertAdmin(who);
        for (const documentId of documentIds) {
            await deleteDocumentRows(ctx, who, documentId);
        }
    },
});

/**
 * Editor `bulkPublish`. For each id: the RLS-wrapped `get` plus a per-document tenant write check,
 * then a full `cms/documents.ts` `save` of the row's CURRENT data with status `published` — so each
 * document gets the required-field validation, its own version snapshot, and its own `onPublish`
 * scheduling (which the bridge coalesces per collection). One atomic mutation: a single invalid or
 * unpublishable document rolls back the entire batch.
 *
 * @param ctx - The tenant mutation context.
 * @param args - The live documents to publish.
 * @returns The per-document save results, in input order.
 * @throws {ConvexError} `CMS_WRITE_FORBIDDEN` on access denial; `CMS_DOCUMENT_NOT_FOUND` when any
 *   id is not visible to the tenant; `CMS_REQUIRED_FIELD_MISSING` when any document is incomplete.
 */
export const bulkPublish = tenantMutation({
    args: { documentIds: v.array(v.id('cmsDocuments')) },
    handler: async (ctx, { documentIds }): Promise<SaveResult[]> => {
        const who = await requireWritePrincipal(ctx);
        const results: SaveResult[] = [];
        for (const documentId of documentIds) {
            const doc = await ctx.db.get(documentId);
            if (!doc) {
                throw new ConvexError({
                    code: CmsDocumentErrorCode.DOCUMENT_NOT_FOUND,
                    message: 'No such document for this tenant.',
                });
            }
            assertTenantScopedWrite(who, { tenant: String(doc.shopId) });
            results.push(
                await ctx.runMutation(api.cms.documents.save, {
                    documentId,
                    collection: doc.collection,
                    data: doc.data,
                    status: 'published',
                }),
            );
        }
        return results;
    },
});

/**
 * Editor `restoreVersion`. Enforces the tenant-scoped write guard, then delegates to
 * `cms/versions.ts`'s `restore`, which re-materializes the snapshot as a NEW draft (history stays
 * append-only and a publish is required to go live again — so a restore schedules no revalidation).
 *
 * @param ctx - The tenant mutation context.
 * @param args - The version snapshot to re-materialize.
 * @returns The live `documentId` and the newly appended draft `versionId`.
 * @throws {ConvexError} `CMS_WRITE_FORBIDDEN` on access denial; `CMS_VERSION_NOT_FOUND` when the
 *   version is not visible to the tenant.
 */
export const restoreVersion = tenantMutation({
    args: { versionId: v.id('cmsVersions') },
    handler: async (ctx, { versionId }): Promise<{ documentId: Id<'cmsDocuments'>; versionId: Id<'cmsVersions'> }> => {
        await requireWritePrincipal(ctx);
        return await ctx.runMutation(api.cms.versions.restore, { versionId });
    },
});
