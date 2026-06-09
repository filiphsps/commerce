import { ProsemirrorSync } from '@convex-dev/prosemirror-sync';
import type { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { ConvexError } from 'convex/values';

import { components } from '../_generated/api';
import type { DataModel } from '../_generated/dataModel';
import { resolveActiveAdminShopId } from '../auth/admin_shop_resolver';

/**
 * Stable string codes carried on every {@link ConvexError} the rich-text sync layer throws, so call
 * sites and `convex-test` branch on the cause without string-matching messages. Convex functions run
 * in the Convex isolate where `@nordcom/commerce-errors` is off the bundle surface, so a `ConvexError`
 * payload with a stable code is the sanctioned in-runtime error contract (the same pattern as
 * `cms/access.ts`, `lib/auth.ts`, and `cms/i18n_shred.ts`).
 */
export const CmsProseMirrorErrorCode = {
    /** A sync document id did not match the `rt:{shopId}:{documentId}:{fieldPath}:{locale}` shape. */
    MALFORMED_DOCUMENT_ID: 'CMS_PROSEMIRROR_MALFORMED_DOCUMENT_ID',
    /** The caller's resolved tenant does not own the addressed sync document. */
    CROSS_TENANT_DOCUMENT: 'CMS_PROSEMIRROR_CROSS_TENANT_DOCUMENT',
} as const;

/**
 * Leading tag stamped on every rich-text sync document id so a malformed or foreign id is rejected
 * before any component call. Kept short because the id rides on every collaborative step.
 */
const RICH_TEXT_SYNC_ID_TAG = 'rt';

/**
 * Field delimiter separating the four addressing segments of a rich-text sync document id. A single
 * character absent from Convex ids (base32), dotted field paths, and BCP-47 locale codes, so a
 * round-trip split is unambiguous.
 */
const RICH_TEXT_SYNC_ID_SEPARATOR = ':';

/**
 * The four-part address a rich-text sync document id encodes — the tenant, the owning CMS document,
 * the rich-text field within it, and the CMSDATA-02 locale bucket the document backs.
 */
export type RichTextSyncAddress = {
    /** The owning tenant — a `shops` row id, the segment the permission checks authorize against. */
    shopId: string;
    /** The CMS document the localized bucket belongs to (a `cmsDocuments` id or a content-row id). */
    documentId: string;
    /** The dotted path of the rich-text field within that document. */
    fieldPath: string;
    /** The locale bucket this document backs. */
    locale: string;
};

/**
 * Derives the stable `@convex-dev/prosemirror-sync` document id a localized rich-text bucket binds to.
 * The tenant is encoded as the leading segment so the sync endpoints' permission checks authorize a
 * read/write from the id alone — no side lookup — and so a client can only ever address documents
 * under its own verified tenant prefix.
 *
 * @param address - The tenant, owning document, field path, and locale the bucket lives at.
 * @returns The opaque sync document id the `useTiptapSync` hook is handed for that bucket.
 */
export function richTextSyncDocumentId(address: RichTextSyncAddress): string {
    return [RICH_TEXT_SYNC_ID_TAG, address.shopId, address.documentId, address.fieldPath, address.locale].join(
        RICH_TEXT_SYNC_ID_SEPARATOR,
    );
}

/**
 * Parses a rich-text sync document id back into its {@link RichTextSyncAddress}, or `null` when the id
 * is not a well-formed rich-text id (wrong tag, wrong segment count, or an empty segment). Total
 * rather than throwing so the permission checks can convert a `null` into the typed
 * {@link CmsProseMirrorErrorCode} `MALFORMED_DOCUMENT_ID` failure.
 *
 * @param id - A sync document id, as produced by {@link richTextSyncDocumentId}.
 * @returns The decoded address, or `null` when `id` is not a rich-text document id.
 */
export function parseRichTextSyncDocumentId(id: string): RichTextSyncAddress | null {
    const segments = id.split(RICH_TEXT_SYNC_ID_SEPARATOR);
    if (segments.length !== 5) return null;
    const [tag, shopId, documentId, fieldPath, locale] = segments;
    if (tag !== RICH_TEXT_SYNC_ID_TAG) return null;
    if (!shopId || !documentId || !fieldPath || !locale) return null;
    return { shopId, documentId, fieldPath, locale };
}

/**
 * The instance binding this package to the registered `prosemirrorSync` component. Parameterized over
 * the opaque `string` document id so the sync endpoints, permission checks, and `useTiptapSync` hook
 * all agree on the id type the {@link richTextSyncDocumentId} scheme produces.
 */
const prosemirrorSync = new ProsemirrorSync<string>(components.prosemirrorSync);

/**
 * Asserts the caller's resolved tenant owns the addressed rich-text document, throwing a typed
 * {@link ConvexError} otherwise, and returns the decoded address. Shared by the read and write
 * permission checks: the component's sync functions are PUBLIC, so this is the only thing standing
 * between a caller authenticated for one tenant and another tenant's document. Because the id embeds
 * its owning shop and the caller's shop is resolved from the signed identity (never the argument),
 * a caller can only ever address documents under its own verified tenant prefix.
 *
 * @param ctx - A Convex query or mutation context exposing `auth` and `db`.
 * @param id - The sync document id the component is about to read or write.
 * @returns The decoded address once ownership is confirmed.
 * @throws {ConvexError} `MALFORMED_DOCUMENT_ID` when `id` is not a rich-text document id.
 * @throws {ConvexError} `CROSS_TENANT_DOCUMENT` when the id's tenant is not the caller's resolved tenant.
 * @throws {ConvexError} The identity/membership failures `resolveActiveAdminShopId` raises.
 */
async function authorizeRichTextDocument(
    ctx: Pick<GenericQueryCtx<DataModel>, 'auth' | 'db'>,
    id: string,
): Promise<RichTextSyncAddress> {
    const address = parseRichTextSyncDocumentId(id);
    if (!address) {
        throw new ConvexError({
            code: CmsProseMirrorErrorCode.MALFORMED_DOCUMENT_ID,
            message: 'Rich-text sync document id is malformed.',
        });
    }
    const shopId = await resolveActiveAdminShopId(ctx);
    if (address.shopId !== shopId) {
        throw new ConvexError({
            code: CmsProseMirrorErrorCode.CROSS_TENANT_DOCUMENT,
            message: 'Rich-text sync document belongs to another tenant.',
        });
    }
    return address;
}

/**
 * Records — or refreshes — the registry row tracking a rich-text sync document, run from the sync
 * layer's post-write `onSnapshot` callback so the `cmsRichTextDocuments` binding table stays in step
 * with the component's own snapshot store. The write uses the raw mutation `db` (the callback fires
 * after `checkWrite` has authorized the caller), upserting by `syncId` so repeated snapshots of the
 * same document touch one row. A document id that is not a rich-text id is ignored rather than thrown
 * on, so a foreign caller can never roll back a legitimate snapshot through this hook.
 *
 * @param ctx - The component's snapshot mutation context (raw, RLS-exempt `db`).
 * @param id - The sync document id just snapshotted.
 * @returns A promise that resolves once the registry row is upserted (or skipped).
 */
async function recordRichTextSnapshot(ctx: GenericMutationCtx<DataModel>, id: string): Promise<void> {
    const address = parseRichTextSyncDocumentId(id);
    if (!address) return;
    const shopId = await resolveActiveAdminShopId(ctx);
    const updatedAt = Date.now();
    const existing = await ctx.db
        .query('cmsRichTextDocuments')
        .withIndex('by_sync_id', (q) => q.eq('syncId', id))
        .unique();
    if (existing) {
        await ctx.db.patch(existing._id, { updatedAt });
        return;
    }
    await ctx.db.insert('cmsRichTextDocuments', {
        syncId: id,
        shopId,
        documentId: address.documentId,
        fieldPath: address.fieldPath,
        locale: address.locale,
        updatedAt,
    });
}

/**
 * The public sync endpoints the `useTiptapSync` hook drives for CMS rich-text authoring (CMSRICH-01).
 * Generated by the `prosemirrorSync` component's `syncApi`, then re-exported under
 * `api.cms.prosemirror.*` so the admin editor binds a Tiptap document to its localized bucket. Every
 * read and write is tenant-gated through {@link authorizeRichTextDocument}, and each snapshot refreshes
 * the {@link recordRichTextSnapshot} binding registry. `pruneSnapshots` keeps only the first and latest
 * snapshot per document, since the binding table — not the snapshot history — is the durable record.
 */
export const { getSnapshot, submitSnapshot, latestVersion, getSteps, submitSteps } = prosemirrorSync.syncApi<DataModel>(
    {
        checkRead: async (ctx, id) => {
            await authorizeRichTextDocument(ctx, id);
        },
        checkWrite: async (ctx, id) => {
            await authorizeRichTextDocument(ctx, id);
        },
        onSnapshot: async (ctx, id) => {
            await recordRichTextSnapshot(ctx, id);
        },
    },
);
