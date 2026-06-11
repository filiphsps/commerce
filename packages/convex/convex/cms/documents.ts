import { ConvexError, v } from 'convex/values';

import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import { BoundedScanExceededError, SCAN_BYTE_BUDGET, SCAN_DOCUMENT_BUDGET } from '../lib/scan_budget';
import { tenantMutation, tenantQuery } from '../lib/tenant';
import { cmsRevalidateKey } from '../revalidate/onPublish';
import { cmsDocumentStatusValidator } from '../tables/cmsVersions';

/**
 * Stable string codes carried on every {@link ConvexError} the document mutations throw, so call
 * sites and `convex-test` branch on the cause without string-matching messages. Convex functions run
 * in the Convex isolate where `@nordcom/commerce-errors` is off the bundle surface, so a
 * `ConvexError` payload with a stable code is the sanctioned in-runtime error contract (the same
 * pattern as `cms/access.ts`'s `CmsAccessErrorCode`).
 */
export const CmsDocumentErrorCode = {
    /** A publish was attempted while one or more server-required fields were empty. */
    REQUIRED_FIELD_MISSING: 'CMS_REQUIRED_FIELD_MISSING',
    /** A save targeted a `documentId` that does not exist for the resolved tenant. */
    DOCUMENT_NOT_FOUND: 'CMS_DOCUMENT_NOT_FOUND',
    /** A document target supplied `keyField` without `keyValue` (or vice versa) — unresolvable. */
    INVALID_DOCUMENT_TARGET: 'CMS_INVALID_DOCUMENT_TARGET',
} as const;

/**
 * Server-trusted required-field registry keyed by collection — the Convex parity of each Payload
 * collection's non-optional fields, mirroring the descriptor-generated content tables
 * (`tables/cms.ts`). Validation reads from HERE, never from a client argument, so a draft cannot
 * smuggle weakened publish rules. Collections absent from the map (the tenant singletons
 * `header`/`footer`/`businessData`, whose only required field is the tenant key) impose no
 * content-required fields.
 */
const REQUIRED_FIELDS_BY_COLLECTION: Record<string, readonly string[]> = {
    pages: ['title', 'slug'],
    articles: ['title', 'slug', 'author'],
    productMetadata: ['shopifyHandle'],
    collectionMetadata: ['shopifyHandle'],
    media: ['alt'],
};

/**
 * Whether a serialized field value counts as empty for publish validation: absent, null, or a
 * blank/whitespace-only string. Non-string values (numbers, booleans, arrays, objects) are treated
 * as present.
 *
 * @param value - The candidate field value pulled from the document's serialized `data`.
 * @returns `true` when the value is missing or a blank string.
 */
function isFieldEmpty(value: unknown): boolean {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    return false;
}

/**
 * Enforces the server-trusted required-field contract for a publish. Looked up from
 * {@link REQUIRED_FIELDS_BY_COLLECTION}; a draft save never calls this, which is what lets an
 * in-flight draft persist with required fields still empty while a publish fails closed.
 *
 * @param collection - The document's collection slug, selecting its required-field set.
 * @param data - The document's serialized field map.
 * @throws {ConvexError} `CMS_REQUIRED_FIELD_MISSING` when any required field is empty.
 */
function assertPublishable(collection: string, data: unknown): void {
    const required = REQUIRED_FIELDS_BY_COLLECTION[collection] ?? [];
    const record = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
    const missing = required.filter((field) => isFieldEmpty(record[field]));
    if (missing.length > 0) {
        throw new ConvexError({
            code: CmsDocumentErrorCode.REQUIRED_FIELD_MISSING,
            message: `Cannot publish: required field(s) empty: ${missing.join(', ')}.`,
            fields: missing,
        });
    }
}

/**
 * Reads ONE live CMS document for the resolved tenant — the Convex-native replacement for the
 * editor shell's `payload.find({ where, limit: 1 })` read (CMSDATA-07). Addressing mirrors
 * `cms/actions.ts`'s `resolveTargetDocumentId` three modes:
 * - **`documentId`** — a literal `cmsDocuments` id; an unparseable or foreign id reads as `null`.
 * - **`keyField`/`keyValue`** — keyField-routed collections (e.g. `productMetadata` by
 *   `shopifyHandle`): the tenant's rows are streamed via `by_shop_collection` and matched on the
 *   serialized `data[keyField]`.
 * - **neither** — tenant singletons (`header`/`footer`/`businessData`/`shops`): the tenant's single
 *   row for the collection IS the target.
 *
 * Built on {@link tenantQuery}, so the shop is pinned from server-trusted context and the
 * RLS-wrapped reader confines the scan to that shop's own rows; a missing document returns `null`
 * (the editor's create flow) rather than throwing. The key scan carries the same budget ceilings as
 * `lib/scan_budget.ts` so a runaway collection fails typed.
 *
 * @param ctx - The tenant query context (RLS-wrapped `db`, server-resolved `shopId`).
 * @param args - The `collection` slug plus at most one addressing mode.
 * @returns The live document, or `null` when none matches.
 * @throws {ConvexError} `CMS_INVALID_DOCUMENT_TARGET` when `keyField`/`keyValue` are not a pair.
 * @throws {BoundedScanExceededError} When the key scan crosses the document or byte budget.
 */
export const get = tenantQuery({
    args: {
        collection: v.string(),
        documentId: v.optional(v.string()),
        keyField: v.optional(v.string()),
        keyValue: v.optional(v.string()),
    },
    handler: async (ctx, { collection, documentId, keyField, keyValue }): Promise<Doc<'cmsDocuments'> | null> => {
        if (documentId !== undefined) {
            const normalized = ctx.db.normalizeId('cmsDocuments', documentId);
            if (!normalized) return null;
            const doc = await ctx.db.get(normalized);
            return doc !== null && doc.collection === collection ? doc : null;
        }
        if ((keyField === undefined) !== (keyValue === undefined)) {
            throw new ConvexError({
                code: CmsDocumentErrorCode.INVALID_DOCUMENT_TARGET,
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
            if (keyField === undefined) return doc;
            const record = (typeof doc.data === 'object' && doc.data !== null ? doc.data : {}) as Record<
                string,
                unknown
            >;
            if (record[keyField] === keyValue) return doc;
        }
        return null;
    },
});

/**
 * The conflict marker {@link save} returns when a draft save's optimistic base predates the
 * document's current publish — the merge-forward half of the G4FIX-01 stale-write contract. The
 * save still applies (the payload becomes the working draft, appended to history), but the caller
 * learns its base was superseded so it can rebase opportunistically.
 */
export type CmsSaveConflict = 'publish-superseded-base';

/**
 * Detects whether a draft save's optimistic base predates the document's current published
 * snapshot — the signal that a publish landed while the save was on the wire (the CMSGATE-02
 * race). Ordering is the clock-free per-document `revision` counter, never wall time, so two saves
 * in the same millisecond still order deterministically. A base that cannot be resolved (an
 * unparseable id, or a snapshot RLS-hidden/deleted) counts as superseded: staleness cannot be
 * disproven, so the marker fails closed.
 *
 * @param db - The RLS-wrapped tenant database reader.
 * @param publishedVersionId - The document's current published-snapshot pointer.
 * @param baseVersionId - The version id the editor branched from, as the client sent it.
 * @returns The conflict marker, or `undefined` when the base is current (it IS the published
 *   snapshot, or postdates it — plain draft-on-draft divergence keeps last-write-wins).
 */
async function detectSupersededBase(
    db: {
        normalizeId: (table: 'cmsVersions', id: string) => Id<'cmsVersions'> | null;
        get: (id: Id<'cmsVersions'>) => Promise<Doc<'cmsVersions'> | null>;
    },
    publishedVersionId: Id<'cmsVersions'>,
    baseVersionId: string,
): Promise<CmsSaveConflict | undefined> {
    const normalized = db.normalizeId('cmsVersions', baseVersionId);
    if (normalized === publishedVersionId) return undefined;
    const base = normalized ? await db.get(normalized) : null;
    if (!base) return 'publish-superseded-base';
    const published = await db.get(publishedVersionId);
    return (published?.revision ?? 0) > (base.revision ?? 0) ? 'publish-superseded-base' : undefined;
}

/**
 * Saves a CMS document under the server-resolved tenant, writing the live row and appending exactly
 * ONE version snapshot per logical save (plus a one-time published-baseline snapshot when adopting
 * a migrated row — see below). The Convex-native replacement for Payload's autosave + `_versions`
 * machinery, carrying the G4FIX-01 published/draft separation:
 *
 * - The live row's `data` is ALWAYS the working draft. A `published` save additionally moves
 *   `publishedVersionId` to the new snapshot (and the derived `status` to `published`); a `draft`
 *   save NEVER touches either, so a draft landing after a publish — including a stale in-flight
 *   autosave — cannot unpublish or change what live reads serve.
 * - A `published` save enforces the server-trusted required-field contract ({@link assertPublishable})
 *   BEFORE any write; a `draft` save deliberately skips it, so an in-flight draft persists with
 *   required fields still empty.
 * - With no `documentId` it inserts a new live `cmsDocuments` row; with one it patches the existing
 *   row (a `documentId` outside the resolved tenant reads as missing under RLS and fails closed).
 * - A draft save over a `published` row that has NO `publishedVersionId` (the ETL/seed shape, which
 *   predates the pointer) first snapshots the row's CURRENT data as a published baseline version
 *   and points `publishedVersionId` at it — byte-preserving what live reads were serving — before
 *   the draft diverges. Unconditional synthesis (rather than scanning history for a published row)
 *   keeps the adoption deterministic, bounded, and byte-identical to the pre-edit serving.
 * - `baseVersionId` is the optimistic base — the version the editor branched from. When a draft
 *   save's base predates the current publish ({@link detectSupersededBase}), the save MERGES
 *   FORWARD: it still applies as the working draft and the result carries the
 *   `publish-superseded-base` conflict marker. Merge-forward (not reject) is the policy the 2s
 *   autosave UX can absorb: a same-session save after the user's own publish carries the page-load
 *   base too, so rejecting would hard-fail every post-publish keystroke until the RSC refresh
 *   rebinds — while nothing is silently lost, because the publish state is untouchable from this
 *   path and every payload lands in the append-only history. Draft-on-draft divergence (no publish
 *   in between) keeps the existing last-write-wins-with-version-history semantics.
 * - Every version row it appends stamps `ctx.author` — the acting principal the tenant tier
 *   resolved from the trusted identity (POLISH-05). Attribution names WHO performed the write that
 *   materialized the row, so the adopted published-baseline snapshot carries the adopting saver
 *   (its original migrated author is unknowable), the same policy as a restore crediting the
 *   restorer.
 * - On the `published` status ONLY it schedules the post-commit revalidation hook
 *   (`internal.revalidate.onPublish`, BRIDGE-05) via `ctx.scheduler.runAfter`, so a draft/autosave save
 *   busts nothing while a publish coalesces into the tenant's debounced cache-revalidation window.
 *
 * Built on {@link tenantMutation} (NOT a raw/system mutation), so the tenant is pinned from
 * server-trusted context and the RLS-wrapped writer confines every read and write to that shop's
 * own rows — a client `shopId` cannot redirect the save.
 *
 * @param ctx - The tenant mutation context (RLS-wrapped `db`, server-resolved `shopId`).
 * @param args - The target `documentId` (omit to create), `collection`, serialized `data`,
 *   `status`, and the optional optimistic `baseVersionId`.
 * @returns The live `documentId`, the newly written `versionId`, and the optional `conflict` marker.
 * @throws {ConvexError} `CMS_REQUIRED_FIELD_MISSING` on a publish with empty required fields;
 *   `CMS_DOCUMENT_NOT_FOUND` when a supplied `documentId` is not visible to the tenant.
 */
export const save = tenantMutation({
    args: {
        documentId: v.optional(v.id('cmsDocuments')),
        collection: v.string(),
        data: v.any(),
        status: cmsDocumentStatusValidator,
        baseVersionId: v.optional(v.string()),
    },
    handler: async (ctx, { documentId, collection, data, status, baseVersionId }) => {
        if (status === 'published') assertPublishable(collection, data);

        const now = Date.now();
        let liveId: Id<'cmsDocuments'>;
        let revision: number;
        let conflict: CmsSaveConflict | undefined;
        if (documentId) {
            const existing = await ctx.db.get(documentId);
            if (!existing) {
                throw new ConvexError({
                    code: CmsDocumentErrorCode.DOCUMENT_NOT_FOUND,
                    message: 'No such document for this tenant.',
                });
            }
            revision = existing.revision ?? 0;

            let publishedVersionId = existing.publishedVersionId;
            if (status === 'draft' && existing.status === 'published' && publishedVersionId === undefined) {
                revision += 1;
                publishedVersionId = await ctx.db.insert('cmsVersions', {
                    shopId: ctx.shopId,
                    documentId,
                    collection: existing.collection,
                    snapshot: existing.data,
                    status: 'published',
                    revision,
                    author: ctx.author,
                    createdAt: now,
                });
                await ctx.db.patch(documentId, { publishedVersionId });
            }
            if (status === 'draft' && publishedVersionId !== undefined && baseVersionId !== undefined) {
                conflict = await detectSupersededBase(ctx.db, publishedVersionId, baseVersionId);
            }

            await ctx.db.patch(documentId, { collection, data, updatedAt: now });
            liveId = documentId;
        } else {
            revision = 0;
            liveId = await ctx.db.insert('cmsDocuments', {
                shopId: ctx.shopId,
                collection,
                data,
                status,
                createdAt: now,
                updatedAt: now,
            });
        }

        revision += 1;
        const versionId = await ctx.db.insert('cmsVersions', {
            shopId: ctx.shopId,
            documentId: liveId,
            collection,
            snapshot: data,
            status,
            revision,
            author: ctx.author,
            createdAt: now,
        });
        await ctx.db.patch(
            liveId,
            status === 'published'
                ? { latestVersionId: versionId, publishedVersionId: versionId, status, revision }
                : { latestVersionId: versionId, revision },
        );

        // Revalidation fires on the published transition ONLY — a draft/autosave save schedules nothing.
        // Scheduled post-commit (never inline) so the live row and its version snapshot are durable
        // before any cache tag is derived; the logic lives in `revalidate/onPublish.ts`, which runs on
        // the system tier because the revalidation bridge tables sit outside this tenant's RLS scope.
        if (status === 'published') {
            await ctx.scheduler.runAfter(0, internal.revalidate.onPublish.onPublish, {
                shopId: ctx.shopId,
                collection,
                key: cmsRevalidateKey(collection, data),
                eventId: crypto.randomUUID(),
            });
        }

        return { documentId: liveId, versionId, ...(conflict === undefined ? {} : { conflict }) };
    },
});
