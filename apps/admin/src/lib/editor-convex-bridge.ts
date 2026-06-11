import 'server-only';

import type {
    EditorCmsDocument,
    EditorCmsListPage,
    EditorCmsVersion,
    EditorConvexBridge,
    EditorRelationshipOption,
} from '@nordcom/commerce-cms/editor';
import type { Media } from '@nordcom/commerce-cms/types';
import { convexIdentityMutation, convexIdentityQuery, createConvexIdentityClient } from '@nordcom/commerce-db';
import { ConvexOperatorTokenMintError } from '@nordcom/commerce-errors';

import { authenticateConvexClient } from './convex-auth';
import { mintConvexOperatorToken } from './convex-token';

/**
 * The result shape Convex's `cms/actions.ts` save mutations return; the bridge
 * surfaces the public `documentId` string plus the G4FIX-01 merge-forward
 * `conflict` marker (set when a draft save's optimistic base predated a publish).
 */
type ConvexSaveResult = { documentId: string; versionId: string; conflict?: 'publish-superseded-base' };

/**
 * The wire shape of a Convex `cmsDocuments` row as the read queries return it —
 * the isolate-private members the bridge collapses away before handing the
 * document to the editor shell.
 */
type ConvexCmsDocumentRow = {
    _id: string;
    collection: string;
    data: unknown;
    status: 'draft' | 'published';
    updatedAt: number;
    latestVersionId?: string;
};

/** The wire shape of Convex `cms/list:list`'s page result. */
type ConvexCmsListResult = {
    docs: ConvexCmsDocumentRow[];
    page: number;
    pageSize: number;
    totalDocs: number;
    totalPages: number;
};

/** The wire shape of a Convex `cmsVersions` row from `cms/versions:list`. */
type ConvexCmsVersionRow = {
    _id: string;
    status: 'draft' | 'published';
    createdAt: number;
};

/**
 * The wire shape of Convex `cms/media:page`'s result — the paginated media library read
 * (`CmsMediaPage`), mirroring `cms/list:list`'s addressing metadata with `Media`-shaped docs.
 */
type ConvexMediaPageResult = {
    docs: Media[];
    page: number;
    pageSize: number;
    totalDocs: number;
    totalPages: number;
};

/**
 * Projects a `cms/media` `Media` wire row into the bridge's {@link EditorCmsDocument} so the media
 * settings surfaces ride the same editor shell as the content collections. Media lives on the
 * tenant `cmsMedia` table — NOT in `cmsDocuments` — so a `cms/list:list` read for the `media`
 * collection legitimately returns nothing (the CMSDATA-07 empty-list concern); this projection is
 * how the list/detail reads reach the REAL table. A media row has no draft lifecycle (a row exists
 * only once `finalizeUpload` persisted it), so `status` is always `published`.
 *
 * @param media - The `Media`-shaped wire row from `cms/media:list`/`byId`.
 * @returns The bridge document whose `data` is the full `Media` shape (the list columns read
 *   `filename`/`mimeType`/`sizes` straight off it).
 */
export function mediaToEditorDocument(media: Media): EditorCmsDocument {
    return {
        documentId: media.id,
        collection: 'media',
        data: media as unknown as Record<string, unknown>,
        status: 'published',
        updatedAt: Date.parse(media.updatedAt),
    };
}

/**
 * Hard ceiling on one relationship-option prefetch — mirrors the Convex side's own
 * `MAX_PAGE_SIZE`/`MAX_LIST_LIMIT` clamp (100), so the edit page's option load is bounded at both
 * ends of the wire.
 */
const RELATIONSHIP_OPTIONS_LIMIT = 100;

/**
 * Field names tried, in order, when deriving a relationship option's display label from a
 * document's serialized data. Covers every keyed CMS collection's natural label field; the
 * document id is the last-resort fallback.
 */
const RELATIONSHIP_LABEL_FIELDS = ['title', 'name', 'slug', 'shopifyHandle', 'legalName', 'email', 'key'] as const;

/**
 * Derives a human-readable option label from a document's serialized field map. Localized fields
 * may be stored as per-locale buckets, so a bucket-shaped candidate falls back to its first string
 * slot — a label heuristic, not a locale resolution (the picker only needs something readable).
 *
 * @param data - The document's serialized field map.
 * @param fallback - Returned when no candidate field yields a string (typically the document id).
 * @returns The label.
 */
function relationshipLabelOf(data: Record<string, unknown>, fallback: string): string {
    for (const field of RELATIONSHIP_LABEL_FIELDS) {
        const value = data[field];
        if (typeof value === 'string' && value.length > 0) return value;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const slot = Object.values(value).find((entry) => typeof entry === 'string' && entry.length > 0);
            if (typeof slot === 'string') return slot;
        }
    }
    return fallback;
}

/**
 * Projects a Convex `cmsDocuments` row into the bridge's {@link EditorCmsDocument}: `_id` becomes
 * the public `documentId` and the serialized `data` is normalized to a record (a non-object value —
 * possible because the column is schema-`any` — reads as an empty document rather than crashing the
 * shell).
 *
 * @param row - The wire row.
 * @returns The bridge document.
 */
function toEditorDocument(row: ConvexCmsDocumentRow): EditorCmsDocument {
    return {
        documentId: row._id,
        collection: row.collection,
        data: (typeof row.data === 'object' && row.data !== null ? row.data : {}) as Record<string, unknown>,
        status: row.status,
        updatedAt: row.updatedAt,
        ...(row.latestVersionId !== undefined ? { latestVersionId: row.latestVersionId } : {}),
    };
}

/**
 * Runs one Convex mutation on a FRESH identity-authenticated client. Per-call
 * construction is the token-hygiene contract: the operator bearer token is
 * minted from the live NextAuth session, applied via `setAuth`, and the client
 * discarded — nothing caches a token across requests and nothing ships it to
 * the browser. Tenant scope is derived entirely inside Convex from the
 * validated identity (`tenantMutation` → `resolveAdminShopId`), so no tenant
 * selector travels as an argument.
 *
 * @param name - The Convex function path in `module/path:function` form.
 * @param args - The mutation's args.
 * @returns The mutation's result.
 * @throws {ConvexOperatorTokenMintError} When no operator token can be minted
 *   (no authenticated session, or the RS256 material is unconfigured).
 */
async function operatorMutation<Result>(name: string, args: Record<string, unknown>): Promise<Result> {
    const client = createConvexIdentityClient();
    const token = await authenticateConvexClient(client, mintConvexOperatorToken);
    if (!token) {
        throw new ConvexOperatorTokenMintError(name);
    }
    return convexIdentityMutation<Result>(client, name, args);
}

/**
 * Runs one Convex query on a FRESH identity-authenticated client — the read-side companion of
 * {@link operatorMutation} with the identical token-hygiene contract (per-call client, per-request
 * bearer token, no tenant selector in the args). Backs the CMSDATA-07 editor shell reads.
 *
 * @param name - The Convex function path in `module/path:function` form.
 * @param args - The query's args.
 * @returns The query's result.
 * @throws {ConvexOperatorTokenMintError} When no operator token can be minted.
 */
async function operatorQuery<Result>(name: string, args: Record<string, unknown>): Promise<Result> {
    const client = createConvexIdentityClient();
    const token = await authenticateConvexClient(client, mintConvexOperatorToken);
    if (!token) {
        throw new ConvexOperatorTokenMintError(name);
    }
    return convexIdentityQuery<Result>(client, name, args);
}

/**
 * Builds the args object for the save-shaped mutations, including each
 * optional addressing field only when present — Convex argument validation
 * expects absent optionals to be omitted, not `undefined`.
 *
 * The bridge contract's `locale` is deliberately DROPPED here: the
 * `cms/actions.ts` mutations accept no `locale` argument yet and treat `data`
 * as the already-serialized field map. CMSDATA-10 (the localized write seam)
 * is the consuming task that adds the localized field-bucket routing and
 * starts forwarding it.
 *
 * @param args - The bridge call's collection, data, and optional document target.
 * @returns The Convex mutation args.
 */
function saveArgs(args: {
    collection: string;
    data: Record<string, unknown>;
    documentId?: string;
    keyField?: string;
    keyValue?: string;
    baseVersionId?: string;
}): Record<string, unknown> {
    return {
        collection: args.collection,
        data: args.data,
        ...(args.documentId !== undefined ? { documentId: args.documentId } : {}),
        ...(args.keyField !== undefined ? { keyField: args.keyField } : {}),
        ...(args.keyValue !== undefined ? { keyValue: args.keyValue } : {}),
        ...(args.baseVersionId !== undefined ? { baseVersionId: args.baseVersionId } : {}),
    };
}

/**
 * The admin app's {@link EditorConvexBridge} binding — the CMSDATA-06 wiring
 * that makes the seven CMSDATA-05 editor actions reach their Convex
 * `cms/actions.ts` mutations instead of throwing `MissingConvexBridgeError`.
 * Every method posts through {@link operatorMutation}, so access is enforced
 * server-side in Convex from the operator's validated identity; this binding
 * adds no policy of its own.
 */
export const editorConvexBridge: EditorConvexBridge = {
    saveDraft: async (args) => {
        const { documentId, conflict } = await operatorMutation<ConvexSaveResult>(
            'cms/actions:saveDraft',
            saveArgs(args),
        );
        return { documentId, ...(conflict === undefined ? {} : { conflict }) };
    },
    publish: async (args) => {
        const { documentId } = await operatorMutation<ConvexSaveResult>('cms/actions:publish', saveArgs(args));
        return { documentId };
    },
    create: async ({ collection, data }) => {
        const { documentId } = await operatorMutation<ConvexSaveResult>('cms/actions:create', { collection, data });
        return { documentId };
    },
    deleteDocument: async ({ documentId }) => {
        await operatorMutation<null>('cms/actions:deleteDocument', { documentId });
    },
    bulkDelete: async ({ documentIds }) => {
        await operatorMutation<null>('cms/actions:bulkDelete', { documentIds });
    },
    bulkPublish: async ({ documentIds }) => {
        await operatorMutation<ConvexSaveResult[]>('cms/actions:bulkPublish', { documentIds });
    },
    restoreVersion: async ({ versionId }) => {
        await operatorMutation<ConvexSaveResult>('cms/actions:restoreVersion', { versionId });
    },
    list: async ({ collection, page, pageSize }): Promise<EditorCmsListPage> => {
        if (collection === 'media') {
            // Media lives on the tenant `cmsMedia` table behind `cms/media:page`, not in
            // `cmsDocuments` (CUTOVER-06: the CMSDATA-07 empty-list fix). The paginated read
            // shares `cms/list:list`'s addressing metadata AND its typed refusals
            // (`CMS_LIST_PAGE_OUT_OF_RANGE`, `CMS_BOUNDED_SCAN_EXCEEDED`), so the editor list
            // shell pages the library exactly like a content collection.
            const result = await operatorQuery<ConvexMediaPageResult>('cms/media:page', {
                ...(page !== undefined ? { page } : {}),
                ...(pageSize !== undefined ? { pageSize } : {}),
            });
            return {
                docs: result.docs.map(mediaToEditorDocument),
                page: result.page,
                pageSize: result.pageSize,
                totalDocs: result.totalDocs,
                totalPages: result.totalPages,
            };
        }
        const result = await operatorQuery<ConvexCmsListResult>('cms/list:list', {
            collection,
            ...(page !== undefined ? { page } : {}),
            ...(pageSize !== undefined ? { pageSize } : {}),
        });
        return {
            docs: result.docs.map(toEditorDocument),
            page: result.page,
            pageSize: result.pageSize,
            totalDocs: result.totalDocs,
            totalPages: result.totalPages,
        };
    },
    getDocument: async ({ collection, documentId, keyField, keyValue }): Promise<EditorCmsDocument | null> => {
        if (collection === 'media') {
            // Same `cmsMedia` routing as `list`: a media document is addressed by its own id and
            // reads null-on-missing (an unparseable/foreign id is normalized away Convex-side).
            if (documentId === undefined) return null;
            const media = await operatorQuery<Media | null>('cms/media:byId', { mediaId: documentId });
            return media === null ? null : mediaToEditorDocument(media);
        }
        const row = await operatorQuery<ConvexCmsDocumentRow | null>('cms/documents:get', {
            collection,
            ...(documentId !== undefined ? { documentId } : {}),
            ...(keyField !== undefined ? { keyField } : {}),
            ...(keyValue !== undefined ? { keyValue } : {}),
        });
        return row === null ? null : toEditorDocument(row);
    },
    listVersions: async ({ documentId }): Promise<EditorCmsVersion[]> => {
        const rows = await operatorQuery<ConvexCmsVersionRow[]>('cms/versions:list', { documentId });
        return rows.map((row) => ({ versionId: row._id, status: row.status, createdAt: row.createdAt }));
    },
    listRelationshipOptions: async ({ relationTo }): Promise<EditorRelationshipOption[]> => {
        // Media lives in its own tenant table behind the paginated `cms/media:page`; every CMS
        // content collection routes through the page-bounded `cms/list:list`. Both reads clamp
        // the requested window server-side, so this prefetch can never unbound. A `relationTo`
        // outside the cmsDocuments world (e.g. the platform `shops` table) simply lists zero
        // documents — a degraded picker, never a crash.
        if (relationTo === 'media') {
            const result = await operatorQuery<ConvexMediaPageResult>('cms/media:page', {
                pageSize: RELATIONSHIP_OPTIONS_LIMIT,
            });
            return result.docs.map((row) => ({ id: row.id, label: row.alt || row.filename || row.id }));
        }
        const page = await operatorQuery<ConvexCmsListResult>('cms/list:list', {
            collection: relationTo,
            pageSize: RELATIONSHIP_OPTIONS_LIMIT,
        });
        return page.docs.map((row) => {
            const data = (typeof row.data === 'object' && row.data !== null ? row.data : {}) as Record<string, unknown>;
            return { id: row._id, label: relationshipLabelOf(data, row._id) };
        });
    },
};

/**
 * Reads one tenant media document on the frozen `Media` contract — the read behind the admin's
 * media detail page. Same per-call identity-client contract as {@link editorConvexBridge}; tenant
 * scope is enforced inside Convex, so a foreign or unparseable id reads as `null`.
 *
 * @param mediaId - The `cmsMedia` document id from the detail route's URL segment.
 * @returns The media document with its read-time serving URLs, or `null` when absent.
 * @throws {ConvexOperatorTokenMintError} When no operator token can be minted.
 */
export async function getMediaById(mediaId: string): Promise<Media | null> {
    return operatorQuery<Media | null>('cms/media:byId', { mediaId });
}

/**
 * The serialized `Media` wire shape `cms/media:finalizeUpload` returns — the members the upload
 * pipeline reads (`id` for the stored document, `mimeType` as the finalize-verified effective
 * type the derivative planner keyed off).
 */
export type FinalizedMediaUpload = {
    id: string;
    mimeType: string;
};

/**
 * The CMSMEDIA storage transport for the admin's media-upload server action — the Convex half of
 * the upload pipeline (`generateUploadUrl` byte-sink issuance, `finalizeUpload` row persistence +
 * derivative planning, `saveDerivatives` plan fulfillment). Same per-call identity-client contract
 * as {@link editorConvexBridge}: tenant scope and the mime allowlist are enforced inside Convex
 * from the operator's validated identity.
 */
export const mediaStorageTransport = {
    /**
     * Issues a short-lived Convex file-storage upload URL for the operator's tenant.
     *
     * @returns The URL to POST the file bytes to.
     */
    generateUploadUrl: (): Promise<{ url: string }> =>
        operatorMutation<{ url: string }>('cms/media:generateUploadUrl', {}),
    /**
     * Finalizes a stored blob into a tenant `cmsMedia` row (verifying the mime allowlist against
     * the recorded blob metadata) and plants the pending derivative plan for images.
     *
     * @param args - The stored blob id plus the upload's metadata.
     * @returns The persisted media document's wire shape.
     */
    finalizeUpload: (args: {
        storageId: string;
        filename: string;
        mimeType: string;
        alt: string;
        caption?: string;
        focal?: { x: number; y: number };
    }): Promise<FinalizedMediaUpload> => operatorMutation<FinalizedMediaUpload>('cms/media:finalizeUpload', args),
    /**
     * Persists the Node-side sharp pass's results: flips each size's plan row to `ready` and
     * records the original's dimensions (and focal point) on the media row.
     *
     * @param args - The owning media id, the original's dimensions, the optional focal point, and
     *   the generated derivatives' storage ids + dimensions.
     */
    saveDerivatives: async (args: {
        mediaId: string;
        original: { width: number; height: number };
        focal?: { x: number; y: number };
        derivatives: Array<{ size: string; storageId: string; width: number; height: number }>;
    }): Promise<void> => {
        await operatorMutation<unknown>('cms/media_derivatives:saveDerivatives', args);
    },
    /**
     * Updates a media row's post-upload editorial metadata (alt/caption/focal). A focal move
     * re-arms the derivative plan Convex-side and reports it via `rearmedDerivatives`, which is
     * the caller's cue to run the Node-side sharp regeneration pass (the CMSMEDIA-02 fulfillment
     * leg) against the original's bytes.
     *
     * @param args - The media id plus the metadata fields to update; `caption: null` clears.
     * @returns The updated `Media` wire document and the derivative re-arm signal.
     */
    updateMediaMetadata: (args: {
        mediaId: string;
        alt?: string;
        caption?: string | null;
        focal?: { x: number; y: number };
    }): Promise<{ media: Media; rearmedDerivatives: boolean }> =>
        operatorMutation<{ media: Media; rearmedDerivatives: boolean }>('cms/media:updateMediaMetadata', args),
};
