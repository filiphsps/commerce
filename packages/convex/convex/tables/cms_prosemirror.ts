import { defineTable } from 'convex/server';
import { type Infer, v } from 'convex/values';

/**
 * Registry row tracking ONE ProseMirror/Tiptap rich-text document (CMSRICH-01). The collaborative
 * document content itself lives in the `@convex-dev/prosemirror-sync` component's OWN snapshot/steps
 * tables — keyed by an opaque string document id — so this side table holds only the binding metadata
 * that maps a tenant's localized rich-text bucket to that document id. One row exists per
 * `(documentId, fieldPath, locale)` triple that has ever been snapshotted: it is what lets a later
 * reaper drop the component documents orphaned when a field or locale is removed, and lets an operator
 * list every rich-text document a shop owns without scanning the component's internal tables.
 *
 * `syncId` is the prosemirror-sync document id (the same opaque string the `useTiptapSync` hook is
 * handed on the client and the sync endpoints authorize in `cms/prosemirror.ts`). It encodes the
 * owning tenant in its leading segment, which is how a read/write permission check resolves the
 * tenant without a side lookup; the parsed `shopId` is denormalized onto the row so the `by_shop`
 * listing is a point range rather than a parse-every-row scan.
 *
 * `documentId` is the STRING id of the CMS document the bucket belongs to (a `cmsDocuments` id or a
 * descriptor content-row id, stored as a string rather than a `v.id(...)` foreign key because the
 * rich-text fields span both the id-keyed Convex-native tier and the `shop: v.string()` descriptor
 * tier). `fieldPath` is the dotted path of the rich-text field within that document and `locale` is
 * the CMSDATA-02 locale bucket the document backs, so the triple uniquely identifies one localized
 * editor surface. `updatedAt` is the epoch-ms time the document was last snapshotted.
 */
export const cmsRichTextDocumentValidator = v.object({
    syncId: v.string(),
    shopId: v.id('shops'),
    documentId: v.string(),
    fieldPath: v.string(),
    locale: v.string(),
    updatedAt: v.number(),
});

/**
 * Inferred row shape for a tracked rich-text sync document. See {@link cmsRichTextDocumentValidator}.
 */
export type CmsRichTextDocument = Infer<typeof cmsRichTextDocumentValidator>;

/**
 * The CMSRICH-01 rich-text binding registry. Spread into `coreTables` (NOT `cmsTables`) via
 * `tables/index.ts`: although it carries a `v.id('shops')` foreign key it is platform infrastructure
 * written only by the prosemirror-sync component's server-trusted `onSnapshot` callback (raw `ctx.db`),
 * so it sits with the other bridge/system registries rather than the descriptor-generated content
 * tier. It deliberately carries NO `tenantRules` entry yet (lib/rls.ts): under the wrapped tenant db's
 * `defaultPolicy: 'deny'` it fails closed, reachable only through the system tier or the component
 * callback until a tenant-tier reader needs it.
 *
 * `by_sync_id` makes the snapshot-time upsert (resolve the existing row for a document id) a point
 * read; `by_shop` makes the per-tenant rich-text-document listing a bounded range.
 */
export const cmsRichTextTables = {
    cmsRichTextDocuments: defineTable(cmsRichTextDocumentValidator)
        .index('by_sync_id', ['syncId'])
        .index('by_shop', ['shopId']),
};
