import { defineTable } from 'convex/server';
import { v } from 'convex/values';

import {
    assertCmsCollectionShredArgWithinCallLimit,
    CMS_SHREDDED_FIELDS_BY_COLLECTION,
    type ShreddableCollection,
} from '../cms/i18n_shred';

/**
 * Side table holding the SHREDDED localized chunks of a `cmsDocuments` row's large rich fields — the
 * Convex-native escape hatch for Payload's single-blob localized richtext/blocks storage. A large
 * localized field (e.g. an article `body`) does not live inline on its parent document, where its
 * full multi-locale bucket would blow Convex's 1 MiB per-document ceiling; instead each
 * `(parentId, fieldPath, locale)` triple is stored as ONE side row whose value is kept under the
 * ~1 MiB Convex value limit. A read reassembles the parent by gathering every side row for the
 * parent through `by_parent_field` and rehydrating each field's bucket byte-for-byte
 * (`cms/i18n_shred.ts`).
 *
 * Spread into `coreTables` (NOT `cmsTables`) via `tables/index.ts`: the row carries a real
 * `v.id('cmsDocuments')` foreign key, so it joins the id-keyed tenant tier its parent
 * (`cmsDocuments`/`cmsVersions`) lives in rather than the forward-referenced `shop: v.string()`
 * descriptor-generated content tables.
 *
 * `by_parent_field` keys `(parentId, fieldPath)` so a reassembly read can gather either every side
 * row for a parent (prefix range on `parentId` alone) or just one field's locale rows (full key) —
 * never a cross-tenant scan. There is deliberately NO index on `value`/`locale` as sort/filter
 * columns: a shredded field has no queryable parent column, and `cms/i18n_shred.ts`'s
 * `parentQueryableField` enforces that no `where`/`sort` against a shredded field compiles.
 */
export const cmsI18nTables = {
    cms_i18n: defineTable(
        v.object({
            parentId: v.id('cmsDocuments'),
            fieldPath: v.string(),
            locale: v.string(),
            value: v.any(),
            createdAt: v.number(),
            updatedAt: v.number(),
        }),
    ).index('by_parent_field', ['parentId', 'fieldPath']),
};

// Schema-gen guard: at table-module load (the moment the schema is composed and codegen runs) reject
// any shreddable collection whose worst-case pre-shred mutation argument — every shreddable field's
// full per-locale bucket inline — would exceed Convex's 16 MiB function-argument limit. Real
// collections (one shreddable field) stay well under it; a future over-fielded collection fails loud
// at schema-gen with the typed `CMS_I18N_COLLECTION_EXCEEDS_CALL_LIMIT` error rather than silently
// shipping a collection no client could ever save in one call.
for (const collection of Object.keys(CMS_SHREDDED_FIELDS_BY_COLLECTION) as ShreddableCollection[]) {
    assertCmsCollectionShredArgWithinCallLimit(collection);
}
