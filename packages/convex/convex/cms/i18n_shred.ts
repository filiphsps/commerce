import type { GenericDatabaseReader, GenericDatabaseWriter } from 'convex/server';
import { ConvexError, getConvexSize, type Value } from 'convex/values';

import type { DataModel, Doc, Id } from '../_generated/dataModel';
import type { LocalizedBucket } from './localization';

/**
 * Stable string codes carried on every {@link ConvexError} the shred layer throws, so call sites and
 * `convex-test` branch on the cause without string-matching messages. Convex functions run in the
 * Convex isolate where `@nordcom/commerce-errors` is off the bundle surface, so a `ConvexError`
 * payload with a stable code is the sanctioned in-runtime error contract (the same pattern as
 * `lib/scan_budget.ts`'s `ScanBudgetErrorCode` and `cms/documents.ts`'s `CmsDocumentErrorCode`).
 */
export const CmsI18nShredErrorCode = {
    /** A single locale's shredded value would not fit under the ~1 MiB Convex value/document limit. */
    VALUE_EXCEEDS_SHRED_LIMIT: 'CMS_I18N_VALUE_EXCEEDS_SHRED_LIMIT',
    /** A collection's worst-case pre-shred mutation argument would exceed the Convex per-call limit. */
    COLLECTION_EXCEEDS_CALL_LIMIT: 'CMS_I18N_COLLECTION_EXCEEDS_CALL_LIMIT',
    /** A shredded field was used where only a queryable (inline) parent column is allowed. */
    SHREDDED_FIELD_NOT_QUERYABLE: 'CMS_I18N_SHREDDED_FIELD_NOT_QUERYABLE',
} as const;

/**
 * Convex's hard per-value and per-document ceiling: 1 MiB. A single stored value (and the document
 * that holds it, system fields included) must encode under this, so each shredded side row's value is
 * capped here minus a fixed reservation for the row's own keys.
 */
const CONVEX_VALUE_LIMIT_BYTES = 1024 * 1024;

/**
 * Headroom subtracted from {@link CONVEX_VALUE_LIMIT_BYTES} to leave room for a `cms_i18n` row's other
 * columns (`parentId`/`fieldPath`/`locale`/timestamps) plus Convex's injected system fields, so a
 * value sized at the cap still produces a side row that fits under the 1 MiB document limit.
 */
const SIDE_ROW_RESERVED_BYTES = 4 * 1024;

/**
 * Maximum encoded size of a single shredded locale value. A value larger than this cannot be stored as
 * one side row even after shredding, so the shred fails loud with {@link CmsI18nShredErrorCode}
 * `VALUE_EXCEEDS_SHRED_LIMIT` rather than letting Convex reject the insert with an opaque engine error.
 */
export const MAX_SHREDDED_VALUE_BYTES = CONVEX_VALUE_LIMIT_BYTES - SIDE_ROW_RESERVED_BYTES;

/**
 * Convex's per-call function-argument ceiling: 16 MiB. The pre-shred mutation argument carries every
 * shreddable field's full per-locale bucket inline (shredding happens server-side, AFTER the argument
 * crosses the boundary), so a collection whose worst-case argument crosses this is unsavable in one
 * call and is rejected at schema-gen by {@link assertShredArgWithinCallLimit}.
 */
const CONVEX_FUNCTION_ARG_LIMIT_BYTES = 16 * 1024 * 1024;

/**
 * Maximum number of locale slots a single shred-on-write call is budgeted to carry per shreddable
 * field, used by the call-limit guard's worst-case sizing. Mirrors `@nordcom/commerce-cms`'s
 * `DEFAULT_MAX_LOCALES_PER_WRITE`; the value is duplicated rather than imported because that module
 * reads `process.env` at load and `process` is absent in the Convex isolate, so pulling it in would
 * crash the bundle.
 */
const MAX_LOCALES_PER_SHRED_WRITE = 8;

/**
 * Server-trusted registry of the LARGE localized fields shredded into `cms_i18n` per collection — the
 * intersection of the localized-field set (`cms/localization.ts`'s `CMS_LOCALIZED_FIELDS_BY_COLLECTION`)
 * with the rich (richtext/blocks-typed) fields that can individually exceed the 1 MiB value ceiling.
 *
 * Only the localized rich bodies qualify: `articles.body` and the `descriptionOverride` of
 * `productMetadata`/`collectionMetadata` are localized `v.any()` richtext. The small localized scalars
 * (`title`, `excerpt`, `caption`) and the localized `seo` group stay INLINE on the parent; `blocks` is
 * not localized (never bucketed), so it is not shredded through this localized path. A collection
 * absent here has no shredded fields and round-trips unchanged.
 */
export const CMS_SHREDDED_FIELDS_BY_COLLECTION = {
    articles: ['body'],
    productMetadata: ['descriptionOverride'],
    collectionMetadata: ['descriptionOverride'],
} as const satisfies Record<string, readonly string[]>;

/**
 * A collection slug that owns at least one shredded field.
 */
export type ShreddableCollection = keyof typeof CMS_SHREDDED_FIELDS_BY_COLLECTION;

/**
 * The literal union of field names shredded into `cms_i18n` for a given collection. Used by the
 * compile-time query guard {@link ParentQueryableField} so a `where`/`sort` against a shredded field
 * fails to type-check.
 */
export type ShreddedFieldName<C extends ShreddableCollection> = (typeof CMS_SHREDDED_FIELDS_BY_COLLECTION)[C][number];

/**
 * Resolves a candidate field name to itself when it is queryable on the PARENT row (an inline column)
 * and to `never` when it is shredded into `cms_i18n`. A shredded field has no parent column to filter
 * or order by, so threading a query key through this type makes any `where`/`sort` on a shredded field
 * a compile error.
 */
export type ParentQueryableField<C extends ShreddableCollection, F extends string> =
    F extends ShreddedFieldName<C> ? never : F;

/**
 * One shredded locale chunk: a single `(fieldPath, locale)` value lifted out of its parent document's
 * inline data. The pure transform unit that {@link shredLocalizedFields} emits and
 * {@link reassembleShreddedFields} consumes.
 */
export type ShreddedSideRow = {
    /** The top-level field the value belongs to (e.g. `body`). */
    readonly fieldPath: string;
    /** The BCP-47 locale code the value is stored under. */
    readonly locale: string;
    /** The locale's stored value (richtext/blocks payload), preserved byte-for-byte. */
    readonly value: unknown;
};

/**
 * The result of shredding a document: the inline data with shredded fields removed, plus the side rows
 * to persist for the removed fields.
 */
export type ShredResult = {
    /** The parent's data with every shredded field stripped — small enough to stay under 1 MiB. */
    readonly inline: Record<string, unknown>;
    /** One entry per `(fieldPath, locale)` lifted out of the inline data. */
    readonly sideRows: readonly ShreddedSideRow[];
};

/**
 * Looks up the shredded field names for an arbitrary collection slug, returning an empty list for a
 * collection with no shredded fields. Narrowing the const registry to a string-indexed record so the
 * lookup is total (and `noUncheckedIndexedAccess`-safe) for runtime callers passing a plain `string`.
 *
 * @param collection - The collection slug to resolve.
 * @returns The shredded field names, or an empty array when the collection shreds nothing.
 */
function shreddedFieldsFor(collection: string): readonly string[] {
    return (CMS_SHREDDED_FIELDS_BY_COLLECTION as Record<string, readonly string[]>)[collection] ?? [];
}

/**
 * Shreds a `cmsDocuments` serialized `data` map: each large localized field named for `collection`
 * ({@link CMS_SHREDDED_FIELDS_BY_COLLECTION}) is lifted out of the inline data and split into one side
 * row per locale slot of its bucket; every other field passes through inline untouched. A shredded
 * field whose value is not a non-empty bucket object (an empty bucket or a stray scalar) is left
 * inline, so an empty/absent rich field round-trips identically rather than vanishing. Pure: never
 * mutates the input.
 *
 * @param collection - The document's collection slug, selecting its shredded-field set.
 * @param data - The document's serialized field map (shredded fields hold locale-keyed buckets).
 * @returns The {@link ShredResult}: inline data plus the per-locale side rows to persist.
 */
export function shredLocalizedFields(collection: string, data: unknown): ShredResult {
    const record = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
    const shredFields = new Set(shreddedFieldsFor(collection));
    const inline: Record<string, unknown> = {};
    const sideRows: ShreddedSideRow[] = [];
    for (const [field, value] of Object.entries(record)) {
        const bucketEntries =
            shredFields.has(field) && typeof value === 'object' && value !== null
                ? Object.entries(value as LocalizedBucket)
                : null;
        if (!bucketEntries || bucketEntries.length === 0) {
            inline[field] = value;
            continue;
        }
        for (const [locale, localeValue] of bucketEntries) {
            sideRows.push({ fieldPath: field, locale, value: localeValue });
        }
    }
    return { inline, sideRows };
}

/**
 * Reassembles a shredded document: rebuilds each shredded field's bucket from its side rows and merges
 * it back onto the inline data, rehydrating every locale slot byte-for-byte. Side rows are grouped by
 * `fieldPath`; within a field the locale slots are written in side-row order, so a gather in the
 * `by_parent_field` index order reproduces the original bucket. Pure: never mutates the inputs.
 *
 * @param inline - The parent's inline data (shredded fields absent).
 * @param sideRows - The side rows gathered for the parent, in `by_parent_field` order.
 * @returns A new field map with every shredded field's bucket restored.
 */
export function reassembleShreddedFields(
    inline: unknown,
    sideRows: readonly ShreddedSideRow[],
): Record<string, unknown> {
    const base = (typeof inline === 'object' && inline !== null ? inline : {}) as Record<string, unknown>;
    const result: Record<string, unknown> = { ...base };
    const buckets = new Map<string, Record<string, unknown>>();
    for (const row of sideRows) {
        const bucket = buckets.get(row.fieldPath) ?? {};
        bucket[row.locale] = row.value;
        buckets.set(row.fieldPath, bucket);
    }
    for (const [field, bucket] of buckets) {
        result[field] = bucket;
    }
    return result;
}

/**
 * Asserts every shredded side row's value encodes under {@link MAX_SHREDDED_VALUE_BYTES}, so each row
 * fits within Convex's 1 MiB document/value ceiling. A single locale value too large to store even as
 * its own side row fails loud rather than as an opaque engine rejection at insert time.
 *
 * @param collection - The collection the rows belong to (carried on the error for diagnostics).
 * @param sideRows - The candidate side rows produced by {@link shredLocalizedFields}.
 * @throws {ConvexError} `CMS_I18N_VALUE_EXCEEDS_SHRED_LIMIT` when any row's value exceeds the per-value cap.
 */
export function assertShreddedValuesWithinLimit(collection: string, sideRows: readonly ShreddedSideRow[]): void {
    for (const row of sideRows) {
        // A shredded value always originates from a localized bucket bound for `v.any()` storage, so it
        // is a valid Convex `Value`; the public `ShreddedSideRow.value` stays `unknown` for callers.
        const size = getConvexSize(row.value as Value);
        if (size > MAX_SHREDDED_VALUE_BYTES) {
            throw new ConvexError({
                code: CmsI18nShredErrorCode.VALUE_EXCEEDS_SHRED_LIMIT,
                message:
                    `Shredded value for ${collection}.${row.fieldPath} (${row.locale}) is ${size} byte(s), ` +
                    `over the ${MAX_SHREDDED_VALUE_BYTES}-byte per-row limit.`,
                collection,
                fieldPath: row.fieldPath,
                locale: row.locale,
                size,
                limit: MAX_SHREDDED_VALUE_BYTES,
            });
        }
    }
}

/**
 * Rejects a collection whose worst-case pre-shred mutation argument would exceed Convex's per-call
 * function-argument limit ({@link CONVEX_FUNCTION_ARG_LIMIT_BYTES}). The worst case sizes every
 * shreddable field at the per-value cap across the full locale budget, since the argument carries each
 * field's whole bucket inline before the server shreds it. This is the schema-gen guard:
 * {@link assertCmsCollectionShredArgWithinCallLimit} runs it for each real collection at table-module
 * load, and a synthetic over-fielded collection trips it in tests.
 *
 * @param input - The collection slug, its shreddable field count, and optional budget overrides.
 * @param input.collection - The collection slug (carried on the error for diagnostics).
 * @param input.shreddableFieldCount - How many large localized fields the collection shreds.
 * @param input.localeBudget - Max locale slots per field in the worst case; defaults to {@link MAX_LOCALES_PER_SHRED_WRITE}.
 * @param input.perValueBytes - Per-value worst-case size; defaults to {@link MAX_SHREDDED_VALUE_BYTES}.
 * @throws {ConvexError} `CMS_I18N_COLLECTION_EXCEEDS_CALL_LIMIT` when the worst case crosses the per-call limit.
 */
export function assertShredArgWithinCallLimit(input: {
    collection: string;
    shreddableFieldCount: number;
    localeBudget?: number;
    perValueBytes?: number;
}): void {
    const localeBudget = input.localeBudget ?? MAX_LOCALES_PER_SHRED_WRITE;
    const perValueBytes = input.perValueBytes ?? MAX_SHREDDED_VALUE_BYTES;
    const worstCaseArgBytes = input.shreddableFieldCount * localeBudget * perValueBytes;
    if (worstCaseArgBytes > CONVEX_FUNCTION_ARG_LIMIT_BYTES) {
        throw new ConvexError({
            code: CmsI18nShredErrorCode.COLLECTION_EXCEEDS_CALL_LIMIT,
            message:
                `Collection ${input.collection} has a worst-case pre-shred argument of ${worstCaseArgBytes} ` +
                `byte(s), over the ${CONVEX_FUNCTION_ARG_LIMIT_BYTES}-byte per-call limit.`,
            collection: input.collection,
            shreddableFieldCount: input.shreddableFieldCount,
            localeBudget,
            perValueBytes,
            worstCaseArgBytes,
            limit: CONVEX_FUNCTION_ARG_LIMIT_BYTES,
        });
    }
}

/**
 * Schema-gen convenience over {@link assertShredArgWithinCallLimit} for a real shreddable collection,
 * resolving its shreddable field count from {@link CMS_SHREDDED_FIELDS_BY_COLLECTION}.
 *
 * @param collection - The shreddable collection to validate.
 * @throws {ConvexError} `CMS_I18N_COLLECTION_EXCEEDS_CALL_LIMIT` when the collection's worst case crosses the per-call limit.
 */
export function assertCmsCollectionShredArgWithinCallLimit(collection: ShreddableCollection): void {
    assertShredArgWithinCallLimit({
        collection,
        shreddableFieldCount: CMS_SHREDDED_FIELDS_BY_COLLECTION[collection].length,
    });
}

/**
 * Compile-time guard returning a field name only when it is queryable on the PARENT row — i.e. NOT
 * shredded into `cms_i18n`. Passing a shredded literal collapses the `field` parameter to `never`, so a
 * `where`/`sort` keyed on a shredded field fails to type-check; at runtime it also throws as
 * defense-in-depth for dynamically-typed callers.
 *
 * @typeParam C - The collection whose shredded-field set scopes the check.
 * @typeParam F - The candidate field name (inferred from the literal argument).
 * @param collection - The collection slug.
 * @param field - The field to use as a query key; must be an inline (non-shredded) field.
 * @returns The validated field name.
 * @throws {ConvexError} `CMS_I18N_SHREDDED_FIELD_NOT_QUERYABLE` when a shredded field reaches it at runtime.
 */
export function parentQueryableField<C extends ShreddableCollection, const F extends string>(
    collection: C,
    field: F & ParentQueryableField<C, F>,
): F {
    if (shreddedFieldsFor(collection).includes(field)) {
        throw new ConvexError({
            code: CmsI18nShredErrorCode.SHREDDED_FIELD_NOT_QUERYABLE,
            message: `Field ${collection}.${field} is shredded into cms_i18n and cannot be filtered or sorted.`,
            collection,
            field,
        });
    }
    return field;
}

/**
 * Shreds a document and PERSISTS its large localized fields into `cms_i18n`, returning the inline data
 * to store on the parent plus the ids of the written side rows. Each side row's value is checked
 * against the per-value cap first ({@link assertShreddedValuesWithinLimit}), so an over-large locale
 * fails loud before any partial write. Takes a raw database writer so it can run from either the
 * system tier or (once an RLS rule for `cms_i18n` lands) a tenant mutation.
 *
 * @param db - A database writer scoped by the caller's tier.
 * @param parentId - The owning `cmsDocuments` row.
 * @param collection - The parent's collection slug, selecting its shredded-field set.
 * @param data - The document's full serialized data (shredded fields hold locale buckets).
 * @param now - The epoch-ms stamp written to the side rows' managed timestamps.
 * @returns The inline data (shredded fields removed) and the inserted side-row ids.
 * @throws {ConvexError} `CMS_I18N_VALUE_EXCEEDS_SHRED_LIMIT` when a single locale value exceeds the per-row cap.
 */
export async function writeShreddedDocument(
    db: GenericDatabaseWriter<DataModel>,
    parentId: Id<'cmsDocuments'>,
    collection: string,
    data: unknown,
    now: number,
): Promise<{ inline: Record<string, unknown>; sideRowIds: Id<'cms_i18n'>[] }> {
    const { inline, sideRows } = shredLocalizedFields(collection, data);
    assertShreddedValuesWithinLimit(collection, sideRows);
    const sideRowIds: Id<'cms_i18n'>[] = [];
    for (const row of sideRows) {
        const id = await db.insert('cms_i18n', {
            parentId,
            fieldPath: row.fieldPath,
            locale: row.locale,
            value: row.value,
            createdAt: now,
            updatedAt: now,
        });
        sideRowIds.push(id);
    }
    return { inline, sideRowIds };
}

/**
 * Gathers every `cms_i18n` side row for a parent through the `by_parent_field` index (a prefix range
 * on `parentId`, so the scan stays inside one parent's rows). The per-parent count is bounded by
 * shreddable fields times locales, so a single `.collect()` here never materializes an unbounded array.
 *
 * @param db - A database reader scoped by the caller's tier.
 * @param parentId - The owning `cmsDocuments` row whose side rows are gathered.
 * @returns The parent's side rows in `by_parent_field` order.
 */
export async function gatherShreddedSideRows(
    db: GenericDatabaseReader<DataModel>,
    parentId: Id<'cmsDocuments'>,
): Promise<Doc<'cms_i18n'>[]> {
    return db
        .query('cms_i18n')
        .withIndex('by_parent_field', (q) => q.eq('parentId', parentId))
        .collect();
}

/**
 * Reassembles a shredded document by gathering every `cms_i18n` side row for `parentId`
 * ({@link gatherShreddedSideRows}) and rehydrating each field's bucket onto the inline data
 * byte-for-byte.
 *
 * @param db - A database reader scoped by the caller's tier.
 * @param parentId - The owning `cmsDocuments` row whose side rows are gathered.
 * @param inline - The parent's stored inline data (shredded fields absent).
 * @returns The full field map with every shredded field's bucket restored.
 */
export async function readShreddedDocument(
    db: GenericDatabaseReader<DataModel>,
    parentId: Id<'cmsDocuments'>,
    inline: unknown,
): Promise<Record<string, unknown>> {
    const rows = await gatherShreddedSideRows(db, parentId);
    const sideRows: ShreddedSideRow[] = rows.map((row) => ({
        fieldPath: row.fieldPath,
        locale: row.locale,
        value: row.value,
    }));
    return reassembleShreddedFields(inline, sideRows);
}
