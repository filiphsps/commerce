import 'server-only';

import type {
    EditorCmsDocument,
    EditorCmsListPage,
    EditorCmsVersion,
    EditorConvexBridge,
} from '@nordcom/commerce-cms/editor';
import { convexIdentityMutation, convexIdentityQuery, createConvexIdentityClient } from '@nordcom/commerce-db';
import { ConvexOperatorTokenMintError } from '@nordcom/commerce-errors';

import { authenticateConvexClient } from './convex-auth';
import { mintConvexOperatorToken } from './convex-token';

/**
 * The result shape Convex's `cms/actions.ts` save mutations return; the bridge
 * surfaces only the public `documentId` string.
 */
type ConvexSaveResult = { documentId: string; versionId: string };

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
}): Record<string, unknown> {
    return {
        collection: args.collection,
        data: args.data,
        ...(args.documentId !== undefined ? { documentId: args.documentId } : {}),
        ...(args.keyField !== undefined ? { keyField: args.keyField } : {}),
        ...(args.keyValue !== undefined ? { keyValue: args.keyValue } : {}),
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
        const { documentId } = await operatorMutation<ConvexSaveResult>('cms/actions:saveDraft', saveArgs(args));
        return { documentId };
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
};
