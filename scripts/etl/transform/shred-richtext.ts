import {
    type LexicalDocument,
    lexicalToProseMirror,
} from '../../../packages/cms/src/editor/richtext/lexical-to-prosemirror';
import {
    assertShreddedValuesWithinLimit,
    CMS_SHREDDED_FIELDS_BY_COLLECTION,
    shredLocalizedFields,
} from '../../../packages/convex/convex/cms/i18n_shred';
import { coerceObjectId, type Doc, deriveId, remapObjectId } from './id-remap';
import { normalizeExtendedJson, type TransformedDoc } from './index';

/**
 * One quarantined document (or version snapshot) in the migration divergence report. A document whose
 * rich text cannot be converted losslessly — or whose single-locale value cannot fit in one `cms_i18n`
 * side row — is NEVER silently dropped or partially migrated; it is excluded from the staged dataset
 * and surfaced here so an operator resolves it before cutover.
 */
export interface CmsTransformDivergence {
    /** The source collection the quarantined document belongs to. */
    collection: string;
    /** The source Mongo `ObjectId` hex of the quarantined document (or version row). */
    legacyId: string;
    /** The field (dot/index path for block-embedded bodies) that failed, when attributable. */
    fieldPath?: string;
    /** The locale slot that failed, when attributable. */
    locale?: string;
    /** The human-readable failure the codec or size gate raised. */
    reason: string;
}

/**
 * The staged output of shredding one source CMS collection: the live `cmsDocuments` rows (inline data
 * only), their `cms_i18n` side rows, the divergence report, and the `documentPayloadId -> shopPayloadId`
 * map the `_versions` transform needs to stamp `cmsVersions.shopId` without re-deriving tenancy.
 */
export interface CmsDocumentDataset {
    cmsDocuments: TransformedDoc[];
    cms_i18n: TransformedDoc[];
    divergences: CmsTransformDivergence[];
    shopIdByDocument: Record<string, string>;
}

/** The discriminated result of a pure rich-text conversion pass: the converted value, or the failure. */
type RichTextConversion<T> = { ok: true; value: T } | { ok: false; fieldPath: string; locale?: string; reason: string };

/**
 * Source-document bookkeeping keys that never belong in `cmsDocuments.data`: identity and tenancy move
 * to the row's surrogate keys, the draft state moves to `status`, and the managed timestamps move to
 * the row's own `createdAt`/`updatedAt` columns.
 */
const CMS_BOOKKEEPING_KEYS = new Set(['_id', '__v', 'tenant', 'shop', '_status', 'createdAt', 'updatedAt']);

/**
 * Orders staged rows by `payloadId` so a table's output is byte-stable regardless of source array
 * order — the same determinism contract as the PIPELINE-01 core. Pure: sorts a copy.
 *
 * @param rows - The staged rows to order.
 * @returns A new array sorted ascending by `payloadId`.
 */
export const sortStagedRows = (rows: readonly TransformedDoc[]): TransformedDoc[] =>
    [...rows].sort((left, right) => (left.payloadId < right.payloadId ? -1 : left.payloadId > right.payloadId ? 1 : 0));

/**
 * Reads a normalized timestamp field as epoch-ms, falling back to `0` for an absent or malformed
 * value so the staged row always satisfies the schema's required `v.number()` columns.
 *
 * @param value - The normalized candidate timestamp.
 * @returns The epoch-ms number, or `0`.
 */
export const epochMsOrZero = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : 0;

/**
 * Projects a normalized source CMS document down to its content field map: every field except the
 * bookkeeping keys ({@link CMS_BOOKKEEPING_KEYS}), in source key order. Pure.
 *
 * @param doc - The normalized source document.
 * @returns A fresh content-only field map.
 */
export const stripCmsBookkeeping = (doc: Doc): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(doc)) {
        if (!CMS_BOOKKEEPING_KEYS.has(key)) out[key] = value;
    }
    return out;
};

/**
 * Detects an already-converted ProseMirror document, so a value that has been through the codec (a
 * re-run over the transform's own output, or a doc saved by the native editor during the freeze
 * window) passes through unchanged instead of being rejected as un-Lexical.
 *
 * @param value - The candidate rich-text value.
 * @returns Whether the value is a serialized ProseMirror `doc`.
 */
const isProseMirrorDocument = (value: unknown): boolean =>
    typeof value === 'object' &&
    value !== null &&
    (value as Doc).type === 'doc' &&
    Array.isArray((value as Doc).content);

/**
 * Detects a stored Lexical document (the `{ root: { children } }` envelope Payload persists).
 *
 * @param value - The candidate rich-text value.
 * @returns Whether the value carries a Lexical `root`.
 */
const isLexicalDocument = (value: unknown): boolean => typeof value === 'object' && value !== null && 'root' in value;

/**
 * Extracts a printable failure reason from a thrown codec/size-gate error without depending on any
 * error class being importable from the scripts tree. The size gate's `ConvexError` carries its text
 * on `message`; the codec's `@nordcom/commerce-errors` `TypeError` stores the descriptive string the
 * thrower passed on `cause` (its `message` stays empty) with only the generic `details` fallback.
 *
 * @param error - The caught value.
 * @returns The failure message.
 */
const reasonOf = (error: unknown): string => {
    if (error instanceof Error) {
        if (error.message.length > 0) return error.message;
        if (typeof error.cause === 'string' && error.cause.length > 0) return error.cause;
        const details = (error as { details?: unknown }).details;
        if (typeof details === 'string' && details.length > 0) return details;
    }
    return String(error);
};

/**
 * Converts one rich-text value through the REAL CMSRICH-04 codec: a Lexical document converts to
 * ProseMirror, an already-ProseMirror document passes through, `null` stays `null` (an empty slot is
 * content), and anything else is unconvertible. Never throws — failures return the divergence branch
 * so the caller quarantines the whole document.
 *
 * @param value - The rich-text value of one locale slot.
 * @param fieldPath - The field path for divergence reporting.
 * @param locale - The locale slot for divergence reporting, when localized.
 * @returns The converted value, or the failure.
 */
const convertRichTextValue = (value: unknown, fieldPath: string, locale?: string): RichTextConversion<unknown> => {
    if (value === null || value === undefined) return { ok: true, value };
    if (isProseMirrorDocument(value)) return { ok: true, value };
    if (!isLexicalDocument(value)) {
        return {
            ok: false,
            fieldPath,
            ...(locale === undefined ? {} : { locale }),
            reason: `Rich-text value is neither a Lexical document nor a ProseMirror document (got ${typeof value}).`,
        };
    }
    try {
        return { ok: true, value: lexicalToProseMirror(value as LexicalDocument) };
    } catch (error: unknown) {
        return { ok: false, fieldPath, ...(locale === undefined ? {} : { locale }), reason: reasonOf(error) };
    }
};

/**
 * Converts a localized rich-text bucket (`{ locale: lexicalDoc }`) value-by-value. A bare Lexical or
 * ProseMirror document where a bucket is expected fails loud: shredding such a value would mangle its
 * top-level keys into fake locales, so the document is quarantined instead.
 *
 * @param bucket - The localized bucket off a registered rich field.
 * @param fieldPath - The field path for divergence reporting.
 * @returns The converted bucket (source locale order preserved), or the failure.
 */
const convertRichTextBucket = (bucket: unknown, fieldPath: string): RichTextConversion<unknown> => {
    if (bucket === null || bucket === undefined) return { ok: true, value: bucket };
    if (isLexicalDocument(bucket) || isProseMirrorDocument(bucket) || typeof bucket !== 'object') {
        return {
            ok: false,
            fieldPath,
            reason: 'Expected a locale bucket on a localized rich-text field, got a bare document/scalar.',
        };
    }
    const out: Record<string, unknown> = {};
    for (const [locale, value] of Object.entries(bucket as Doc)) {
        const converted = convertRichTextValue(value, fieldPath, locale);
        if (!converted.ok) return converted;
        out[locale] = converted.value;
    }
    return { ok: true, value: out };
};

/**
 * Deep-converts the Lexical bodies EMBEDDED in block arrays (the `rich-text` block's localized
 * `body`), recursing through arrays and plain objects while preserving key order. Blocks are not
 * localized at the top level so they stay inline on the parent, but their bodies still carry Lexical
 * JSON that the ProseMirror-native renderer cannot display — the conversion must reach them in the
 * same lockstep pass as the shredded top-level bodies.
 *
 * @param value - Any node of the document's field map.
 * @param path - The dot/index path accumulated for divergence reporting.
 * @returns The converted node, or the first failure encountered.
 */
const convertEmbeddedRichTextBlocks = (value: unknown, path: string): RichTextConversion<unknown> => {
    if (Array.isArray(value)) {
        const out: unknown[] = [];
        for (let index = 0; index < value.length; index += 1) {
            const converted = convertEmbeddedRichTextBlocks(value[index], `${path}.${index}`);
            if (!converted.ok) return converted;
            out.push(converted.value);
        }
        return { ok: true, value: out };
    }
    if (typeof value !== 'object' || value === null || isLexicalDocument(value) || isProseMirrorDocument(value)) {
        return { ok: true, value };
    }
    const node = value as Doc;
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(node)) {
        if (node.blockType === 'rich-text' && key === 'body') {
            const converted = convertRichTextBucket(nested, `${path}.body`);
            if (!converted.ok) return converted;
            out[key] = converted.value;
            continue;
        }
        const converted = convertEmbeddedRichTextBlocks(nested, `${path}.${key}`);
        if (!converted.ok) return converted;
        out[key] = converted.value;
    }
    return { ok: true, value: out };
};

/**
 * Converts every rich-text body of one document's content field map Lexical→ProseMirror through the
 * REAL CMSRICH-04 codec: the collection's registered shredded fields (the localized rich bodies the
 * runtime shredder lifts into `cms_i18n`) plus any block-embedded `rich-text` body. Pure and total:
 * an unconvertible node returns the failure branch — the caller quarantines the WHOLE document into
 * the divergence report rather than migrating it partially converted.
 *
 * @param collection - The collection slug, selecting the registered rich-field set.
 * @param data - The document's content field map (bookkeeping already stripped).
 * @returns The converted field map (key order preserved), or the first failure.
 */
export const convertCmsRichText = (
    collection: string,
    data: Record<string, unknown>,
): RichTextConversion<Record<string, unknown>> => {
    const registered = new Set<string>(
        (CMS_SHREDDED_FIELDS_BY_COLLECTION as Record<string, readonly string[]>)[collection] ?? [],
    );
    const out: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(data)) {
        if (registered.has(field)) {
            const converted = convertRichTextBucket(value, field);
            if (!converted.ok) return converted;
            out[field] = converted.value;
            continue;
        }
        const converted = convertEmbeddedRichTextBlocks(value, field);
        if (!converted.ok) return converted;
        out[field] = converted.value;
    }
    return { ok: true, value: out };
};

/**
 * Transforms one source CMS collection into its staged `cmsDocuments` + `cms_i18n` rows, in lockstep
 * with the runtime layout the reassemble-on-read path expects:
 *
 * - rich-text bodies convert Lexical→ProseMirror via the real CMSRICH-04 codec; an unconvertible node
 *   quarantines the whole document into {@link CmsDocumentDataset.divergences} — never a silent drop;
 * - the converted data is shredded through the runtime's OWN `shredLocalizedFields`, so each large
 *   localized field becomes one side row per `(parentId, fieldPath, locale)` and the small localized
 *   scalars stay inline on the parent exactly as `cms/i18n_shred.ts` stores them;
 * - every side row is gated by the runtime's `assertShreddedValuesWithinLimit` (the ~1 MiB Convex
 *   value cap); a single locale too large for one row quarantines its document;
 * - all ids are deterministic PIPELINE-01 derivations (`cmsDocuments` from the source `ObjectId`;
 *   side rows from `(parentPayloadId, fieldPath, locale)`), so a re-run is byte-identical and a
 *   re-import upserts instead of duplicating.
 *
 * A document with no resolvable `_id` or tenant ref is skipped (the PIPELINE-01 null-return
 * convention); `latestVersionId` is stamped later by `versions.ts`'s `applyLatestVersionPointers`.
 * Pure — no IO, never mutates `raws`.
 *
 * @param collection - The source collection slug (e.g. `articles`).
 * @param raws - The collection's raw mongoexport documents.
 * @returns The staged dataset: documents, side rows, divergences, and the document→shop id map.
 */
export const transformCmsDocuments = (collection: string, raws: readonly Doc[]): CmsDocumentDataset => {
    const cmsDocuments: TransformedDoc[] = [];
    const cmsI18n: TransformedDoc[] = [];
    const divergences: CmsTransformDivergence[] = [];
    const shopIdByDocument: Record<string, string> = {};

    for (const raw of raws) {
        const doc = normalizeExtendedJson(raw) as Doc;
        const legacyId = coerceObjectId(doc._id);
        if (!legacyId) continue;
        const shopHex = coerceObjectId(doc.tenant ?? doc.shop);
        if (!shopHex) continue;

        const payloadId = remapObjectId('cmsDocuments', legacyId);
        const shopId = remapObjectId('shops', shopHex);

        const converted = convertCmsRichText(collection, stripCmsBookkeeping(doc));
        if (!converted.ok) {
            divergences.push({
                collection,
                legacyId,
                fieldPath: converted.fieldPath,
                ...(converted.locale === undefined ? {} : { locale: converted.locale }),
                reason: converted.reason,
            });
            continue;
        }

        const { inline, sideRows } = shredLocalizedFields(collection, converted.value);
        try {
            assertShreddedValuesWithinLimit(collection, sideRows);
        } catch (error: unknown) {
            const detail = (error as { data?: { fieldPath?: string; locale?: string } }).data;
            divergences.push({
                collection,
                legacyId,
                ...(typeof detail?.fieldPath === 'string' ? { fieldPath: detail.fieldPath } : {}),
                ...(typeof detail?.locale === 'string' ? { locale: detail.locale } : {}),
                reason: reasonOf(error),
            });
            continue;
        }

        const createdAt = epochMsOrZero(doc.createdAt);
        const updatedAt = epochMsOrZero(doc.updatedAt);
        const status = doc._status === 'draft' ? 'draft' : 'published';

        cmsDocuments.push({
            payloadId,
            document: { shopId, collection, data: inline, status, createdAt, updatedAt },
        });
        shopIdByDocument[payloadId] = shopId;

        for (const row of sideRows) {
            cmsI18n.push({
                payloadId: deriveId('cms_i18n', payloadId, row.fieldPath, row.locale),
                document: {
                    parentId: payloadId,
                    fieldPath: row.fieldPath,
                    locale: row.locale,
                    value: row.value,
                    createdAt,
                    updatedAt,
                },
            });
        }
    }

    divergences.sort((left, right) =>
        `${left.legacyId} ${left.fieldPath ?? ''} ${left.locale ?? ''}` <
        `${right.legacyId} ${right.fieldPath ?? ''} ${right.locale ?? ''}`
            ? -1
            : 1,
    );
    // Side rows are STABLE-sorted by (parentId, fieldPath) only — never by the hashed payloadId —
    // because locale order within a field must stay in source-bucket order: the import inserts side
    // rows in staged order, and the runtime gather (`by_parent_field` then `_creationTime`) replays
    // insertion order, so this is what makes reassemble-on-read reproduce each bucket byte-for-byte.
    const ordered = [...cmsI18n].sort((left, right) => {
        const leftKey = `${left.document.parentId} ${left.document.fieldPath}`;
        const rightKey = `${right.document.parentId} ${right.document.fieldPath}`;
        return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    });
    return {
        cmsDocuments: sortStagedRows(cmsDocuments),
        cms_i18n: ordered,
        divergences,
        shopIdByDocument,
    };
};
