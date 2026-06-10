import { coerceObjectId, type Doc, remapObjectId } from './id-remap';
import { normalizeExtendedJson, type TransformedDoc } from './index';
import { epochMsOrZero, sortStagedRows } from './shred-richtext';

/**
 * The single storage side effect the media migration plans: stream the original object out of the
 * S3/R2 bucket (at its PRESERVED key) into Convex file storage, then patch the staged row's
 * `storageId` with the blob reference the upload returns. Named as a constant so the import executor
 * and the plan records cannot drift on the action discriminant.
 */
export const CMS_MEDIA_STORAGE_ACTION = 'copyToConvexStorage' as const;

/**
 * One post-import storage action: the side-effect HALF of relocating a Payload media document. The
 * transform stays pure — it only EMITS these records; the import step executes them after the row
 * import commits (the post-commit ordering that keeps a failed blob copy re-runnable without
 * re-staging the dataset). `targetKey` always equals `sourceKey`: the S3/R2 key is preserved
 * verbatim, so the source bucket is never rewritten and a re-run re-reads the same object.
 */
export interface CmsMediaStorageActionRecord {
    /** The staged `cmsMedia` row the copied blob's `storageId` is patched onto. */
    mediaPayloadId: string;
    /** The original S3/R2 object key (`prefix/filename` exactly as the Payload storage plugin wrote it). */
    sourceKey: string;
    /** The preserved key — always identical to `sourceKey`; the migration never relocates bucket objects. */
    targetKey: string;
    /** The action discriminant the import executor switches on. */
    storageAction: typeof CMS_MEDIA_STORAGE_ACTION;
}

/**
 * The staged output of the media migration: the `cmsMedia` rows (schema-shaped, MINUS `storageId` —
 * the import inserts each row only after its plan action yields the Convex blob reference) plus the
 * deterministic storage side-effect plan.
 */
export interface CmsMediaDataset {
    cmsMedia: TransformedDoc[];
    storagePlan: CmsMediaStorageActionRecord[];
}

/**
 * Flattens a Payload `caption` value onto the single optional string column `cmsMedia.caption`
 * carries. The legacy field is localized (a locale bucket); the Convex ledger keeps one caption, so
 * the platform default locale (`en-US`) wins, falling back to the lexicographically first locale
 * that holds a string — a deterministic pick rather than bucket-iteration order. A plain string
 * passes through and anything else flattens to absent.
 *
 * @param value - The normalized source `caption` value.
 * @returns The flattened caption, or `undefined` when none resolves.
 */
const flattenCaption = (value: unknown): string | undefined => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const bucket = value as Doc;
        const preferred = bucket['en-US'];
        if (typeof preferred === 'string') return preferred;
        for (const locale of Object.keys(bucket).sort()) {
            const candidate = bucket[locale];
            if (typeof candidate === 'string') return candidate;
        }
    }
    return undefined;
};

/**
 * Copies an optional numeric column off the source document when present and finite, preserving the
 * derivative-pass fields (`width`/`height`/`focalX`/`focalY`) the schema keeps optional.
 *
 * @param target - The staged document under construction.
 * @param source - The normalized source document.
 * @param key - The column name.
 */
const copyOptionalNumber = (target: Doc, source: Doc, key: string): void => {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) target[key] = value;
};

/**
 * Relocates one collection of Payload media documents into staged `cmsMedia` rows plus the storage
 * side-effect plan:
 *
 * - the original S3/R2 key is PRESERVED: `prefix/filename` exactly as the Payload storage plugin's
 *   `generateFileURL` derived it (`filename` alone when no prefix), carried on the plan record as
 *   both `sourceKey` and `targetKey`;
 * - the transform is PURE — zero storage IO. The blob copy is emitted as one
 *   {@link CmsMediaStorageActionRecord} per row for the import step to execute post-commit, after
 *   which it patches the row's `storageId` (which is why the staged document deliberately omits it);
 * - the localized `caption` bucket flattens deterministically onto the single string column; the
 *   editorial/storage fields (`filename`/`mimeType`/`filesize`/`alt`) and the optional derivative
 *   fields carry through verbatim;
 * - ids are deterministic PIPELINE-01 derivations, so a re-run stages a byte-identical dataset and
 *   plan (no duplicate copies on re-import).
 *
 * A document with no resolvable `_id`, tenant ref, `filename`, or `mimeType` is skipped (the
 * PIPELINE-01 null-return convention — without a filename there is no object key to copy, and the
 * finalize-verified mime contract refuses a row with no recorded type). Never mutates `raws`.
 *
 * @param raws - The raw `media` mongoexport documents.
 * @returns The staged rows and the storage plan, both ordered by surrogate id.
 */
export const transformCmsMedia = (raws: readonly Doc[]): CmsMediaDataset => {
    const cmsMedia: TransformedDoc[] = [];
    const storagePlan: CmsMediaStorageActionRecord[] = [];

    for (const raw of raws) {
        const doc = normalizeExtendedJson(raw) as Doc;
        const legacyId = coerceObjectId(doc._id);
        if (!legacyId) continue;
        const shopHex = coerceObjectId(doc.tenant ?? doc.shop);
        if (!shopHex) continue;
        const filename = typeof doc.filename === 'string' && doc.filename.length > 0 ? doc.filename : null;
        if (!filename) continue;
        const mimeType = typeof doc.mimeType === 'string' && doc.mimeType.length > 0 ? doc.mimeType : null;
        if (!mimeType) continue;

        const payloadId = remapObjectId('cmsMedia', legacyId);
        const prefix = typeof doc.prefix === 'string' && doc.prefix.length > 0 ? doc.prefix : null;
        const key = prefix ? `${prefix}/${filename}` : filename;

        const document: Doc = {
            shopId: remapObjectId('shops', shopHex),
            filename,
            mimeType,
            filesize: typeof doc.filesize === 'number' && Number.isFinite(doc.filesize) ? doc.filesize : 0,
            alt: typeof doc.alt === 'string' ? doc.alt : '',
        };
        const caption = flattenCaption(doc.caption);
        if (caption !== undefined) document.caption = caption;
        for (const column of ['width', 'height', 'focalX', 'focalY']) copyOptionalNumber(document, doc, column);
        document.createdAt = epochMsOrZero(doc.createdAt);
        document.updatedAt = epochMsOrZero(doc.updatedAt);

        cmsMedia.push({ payloadId, document });
        storagePlan.push({
            mediaPayloadId: payloadId,
            sourceKey: key,
            targetKey: key,
            storageAction: CMS_MEDIA_STORAGE_ACTION,
        });
    }

    return {
        cmsMedia: sortStagedRows(cmsMedia),
        storagePlan: [...storagePlan].sort((left, right) => (left.mediaPayloadId < right.mediaPayloadId ? -1 : 1)),
    };
};
