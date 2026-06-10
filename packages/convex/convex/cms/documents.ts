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
 * Saves a CMS document under the server-resolved tenant, writing the live row and appending exactly
 * ONE version snapshot per logical save. The Convex-native replacement for Payload's autosave +
 * `_versions` machinery:
 *
 * - A `published` save enforces the server-trusted required-field contract ({@link assertPublishable})
 *   BEFORE any write; a `draft` save deliberately skips it, so an in-flight draft persists with
 *   required fields still empty.
 * - With no `documentId` it inserts a new live `cmsDocuments` row; with one it patches the existing
 *   row (a `documentId` outside the resolved tenant reads as missing under RLS and fails closed).
 * - It then inserts one `cmsVersions` snapshot pointing back at the live row and advances the live
 *   row's `latestVersionId` to it, so the pointer always names the most recent save.
 * - On the `published` status ONLY it schedules the post-commit revalidation hook
 *   (`internal.revalidate.onPublish`, BRIDGE-05) via `ctx.scheduler.runAfter`, so a draft/autosave save
 *   busts nothing while a publish coalesces into the tenant's debounced cache-revalidation window.
 *
 * Built on {@link tenantMutation} (NOT a raw/system mutation), so the tenant is pinned from
 * server-trusted context and the RLS-wrapped writer confines every read and write to that shop's
 * own rows — a client `shopId` cannot redirect the save.
 *
 * @param ctx - The tenant mutation context (RLS-wrapped `db`, server-resolved `shopId`).
 * @param args - The target `documentId` (omit to create), `collection`, serialized `data`, and `status`.
 * @returns The live `documentId` and the newly written `versionId`.
 * @throws {ConvexError} `CMS_REQUIRED_FIELD_MISSING` on a publish with empty required fields;
 *   `CMS_DOCUMENT_NOT_FOUND` when a supplied `documentId` is not visible to the tenant.
 */
export const save = tenantMutation({
    args: {
        documentId: v.optional(v.id('cmsDocuments')),
        collection: v.string(),
        data: v.any(),
        status: cmsDocumentStatusValidator,
    },
    handler: async (ctx, { documentId, collection, data, status }) => {
        if (status === 'published') assertPublishable(collection, data);

        const now = Date.now();
        let liveId: Id<'cmsDocuments'>;
        if (documentId) {
            const existing = await ctx.db.get(documentId);
            if (!existing) {
                throw new ConvexError({
                    code: CmsDocumentErrorCode.DOCUMENT_NOT_FOUND,
                    message: 'No such document for this tenant.',
                });
            }
            await ctx.db.patch(documentId, { collection, data, status, updatedAt: now });
            liveId = documentId;
        } else {
            liveId = await ctx.db.insert('cmsDocuments', {
                shopId: ctx.shopId,
                collection,
                data,
                status,
                createdAt: now,
                updatedAt: now,
            });
        }

        const versionId = await ctx.db.insert('cmsVersions', {
            shopId: ctx.shopId,
            documentId: liveId,
            collection,
            snapshot: data,
            status,
            createdAt: now,
        });
        await ctx.db.patch(liveId, { latestVersionId: versionId });

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

        return { documentId: liveId, versionId };
    },
});
