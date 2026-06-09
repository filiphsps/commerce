import 'server-only';

import type { EditorConvexBridge } from '@nordcom/commerce-cms/editor';
import { convexIdentityMutation, createConvexIdentityClient } from '@nordcom/commerce-db';
import { ConvexOperatorTokenMintError } from '@nordcom/commerce-errors';

import { authenticateConvexClient } from './convex-auth';
import { mintConvexOperatorToken } from './convex-token';

/**
 * The result shape Convex's `cms/actions.ts` save mutations return; the bridge
 * surfaces only the public `documentId` string.
 */
type ConvexSaveResult = { documentId: string; versionId: string };

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
};
