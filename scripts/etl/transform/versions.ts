import { coerceObjectId, type Doc, remapObjectId } from './id-remap';
import { normalizeExtendedJson, type TransformedDoc } from './index';
import { type CmsTransformDivergence, convertCmsRichText, epochMsOrZero, stripCmsBookkeeping } from './shred-richtext';

/**
 * The staged output of migrating one collection's Payload `_versions` companion rows: the
 * `cmsVersions` rows in chronological order, the per-document latest-/published-version pointer
 * maps, and the divergence report for snapshots whose rich text could not convert.
 */
export interface CmsVersionsDataset {
    cmsVersions: TransformedDoc[];
    /** `cmsDocuments` surrogate id → the surrogate id of its latest `cmsVersions` row. */
    latestVersionIdByDocument: Record<string, string>;
    /**
     * `cmsDocuments` surrogate id → the surrogate id of its chronologically last `published`
     * `cmsVersions` row — the G4FIX-01 `publishedVersionId` seed. Documents with no published
     * snapshot in history are absent; their live rows stay pointer-less, and the Convex read path
     * serves their own `data` (for a migrated row the live data IS the published content) until the
     * first native draft save adopts a baseline.
     */
    publishedVersionIdByDocument: Record<string, string>;
    divergences: CmsTransformDivergence[];
}

/** One deduplicated, normalized version row staged for ordering and pointer derivation. */
interface StagedVersion {
    payloadId: string;
    documentId: string;
    shopId: string;
    snapshot: Record<string, unknown>;
    status: 'draft' | 'published';
    createdAt: number;
    updatedAt: number;
    latest: boolean;
}

/**
 * Chronological comparator for staged versions: `updatedAt` ascending with the surrogate id as the
 * deterministic tiebreak, so two saves in the same millisecond still order identically across runs.
 *
 * @param left - One staged version.
 * @param right - The other staged version.
 * @returns The sort ordering.
 */
const byChronology = (left: StagedVersion, right: StagedVersion): number =>
    left.updatedAt !== right.updatedAt
        ? left.updatedAt - right.updatedAt
        : left.payloadId < right.payloadId
          ? -1
          : left.payloadId > right.payloadId
            ? 1
            : 0;

/**
 * Migrates one collection's Payload `_versions` rows into staged `cmsVersions` rows with the parent
 * `latestVersionId` pointers intact:
 *
 * - every id is a deterministic PIPELINE-01 derivation (`cmsVersions` from the version `ObjectId`,
 *   `documentId` from the `parent` ref through the SAME `cmsDocuments` derivation the document
 *   transform uses), so the pointer graph is internally consistent without a live deployment;
 * - the offline freeze-window quiesce: rows are ordered by `updatedAt` (surrogate-id tiebreak), and a
 *   re-export superseding a row (same `_id`, newer `updatedAt` — the 2s-autosave moving target)
 *   replaces it idempotently instead of duplicating, so re-running on a catch-up export converges;
 * - emission is CHRONOLOGICAL, not id-ordered: the runtime version list orders by `_creationTime`
 *   within `by_document`, so the import must insert history oldest-first for restored ordering;
 * - snapshot rich text converts Lexical→ProseMirror through the same lockstep pass as the live
 *   documents; an unconvertible snapshot quarantines that VERSION row into the divergence report;
 * - the latest pointer per document is the row Payload flags `latest: true` (chronologically last
 *   among flagged when a stale flag survives a re-export), falling back to the chronologically last
 *   row when no flag is present.
 *
 * Rows with no resolvable `_id`/`parent`, no snapshot object, or no resolvable shop are skipped (the
 * PIPELINE-01 null-return convention). Pure — no IO, never mutates `raws`.
 *
 * @param collection - The parent collection slug (e.g. `articles`).
 * @param raws - The raw `_<collection>_versions` mongoexport documents.
 * @param shopIdByDocument - `cmsDocuments` surrogate id → shop surrogate id, from `transformCmsDocuments`.
 * @returns The staged versions dataset.
 */
export const transformCmsVersions = (
    collection: string,
    raws: readonly Doc[],
    shopIdByDocument: Readonly<Record<string, string>>,
): CmsVersionsDataset => {
    const staged = new Map<string, StagedVersion>();
    const divergencesById = new Map<string, CmsTransformDivergence>();

    for (const raw of raws) {
        const doc = normalizeExtendedJson(raw) as Doc;
        const legacyId = coerceObjectId(doc._id);
        if (!legacyId) continue;
        const parentHex = coerceObjectId(doc.parent);
        if (!parentHex) continue;
        const versionData = doc.version;
        if (!versionData || typeof versionData !== 'object' || Array.isArray(versionData)) continue;

        const payloadId = remapObjectId('cmsVersions', legacyId);
        const documentId = remapObjectId('cmsDocuments', parentHex);

        const tenantHex = coerceObjectId((versionData as Doc).tenant ?? (versionData as Doc).shop);
        const shopId = shopIdByDocument[documentId] ?? (tenantHex ? remapObjectId('shops', tenantHex) : undefined);
        if (!shopId) continue;

        const createdAt = epochMsOrZero(doc.createdAt);
        const updatedAt = epochMsOrZero(doc.updatedAt) || createdAt;

        const existing = staged.get(payloadId);
        if (existing && existing.updatedAt >= updatedAt) continue;

        const converted = convertCmsRichText(collection, stripCmsBookkeeping(versionData as Doc));
        if (!converted.ok) {
            divergencesById.set(payloadId, {
                collection,
                legacyId,
                fieldPath: converted.fieldPath,
                ...(converted.locale === undefined ? {} : { locale: converted.locale }),
                reason: converted.reason,
            });
            continue;
        }
        // A superseding re-export row converted cleanly: its earlier failure no longer applies.
        divergencesById.delete(payloadId);

        staged.set(payloadId, {
            payloadId,
            documentId,
            shopId,
            snapshot: converted.value,
            status: (versionData as Doc)._status === 'published' ? 'published' : 'draft',
            createdAt,
            updatedAt,
            latest: doc.latest === true,
        });
    }

    const chronological = [...staged.values()].sort(byChronology);

    const latestVersionIdByDocument: Record<string, string> = {};
    const publishedVersionIdByDocument: Record<string, string> = {};
    for (const version of chronological) {
        const current = latestVersionIdByDocument[version.documentId];
        const currentIsFlagged = current !== undefined && staged.get(current)?.latest === true;
        // Chronological iteration means a later row overwrites an earlier one; a `latest`-flagged row
        // is only ever displaced by another flagged row, so Payload's pin survives stale tails.
        if (current === undefined || version.latest || !currentIsFlagged) {
            latestVersionIdByDocument[version.documentId] = version.payloadId;
        }
        // The published pointer is purely chronological — Payload keeps no published-pin flag, and
        // the collection row's own data is the published content the last published version froze.
        if (version.status === 'published') {
            publishedVersionIdByDocument[version.documentId] = version.payloadId;
        }
    }

    return {
        cmsVersions: chronological.map((version) => ({
            payloadId: version.payloadId,
            document: {
                shopId: version.shopId,
                documentId: version.documentId,
                collection,
                snapshot: version.snapshot,
                status: version.status,
                createdAt: version.createdAt,
            },
        })),
        latestVersionIdByDocument,
        publishedVersionIdByDocument,
        divergences: [...divergencesById.values()].sort((left, right) => (left.legacyId < right.legacyId ? -1 : 1)),
    };
};

/**
 * Stamps the derived version pointers onto staged `cmsDocuments` rows, completing the
 * document↔version graph: each row whose surrogate id has a pointer gets `latestVersionId` set to
 * the latest `cmsVersions` surrogate id, and each row whose live state is `published` additionally
 * gets `publishedVersionId` set to its last published snapshot (the import reconciles all sides to
 * live ids in one pass). The published pointer is withheld from `draft` rows — a draft live row
 * means Payload never had (or no longer has) the document published, so pointing live reads at an
 * old published snapshot would resurrect unpublished content. Rows without history pass through
 * untouched — both pointers are optional on the schema, and `revision` is deliberately NOT staged:
 * migrated rows compare as revision 0, which the runtime stale-write guard treats as predating any
 * native publish. Pure: returns fresh rows, never mutates the inputs.
 *
 * @param documents - Staged `cmsDocuments` rows from `transformCmsDocuments`.
 * @param history - The staged versions dataset from {@link transformCmsVersions}.
 * @returns New staged rows with the version pointers applied where history exists.
 */
export const applyLatestVersionPointers = (
    documents: readonly TransformedDoc[],
    history: Pick<CmsVersionsDataset, 'latestVersionIdByDocument' | 'publishedVersionIdByDocument'>,
): TransformedDoc[] =>
    documents.map((row) => {
        const latestVersionId = history.latestVersionIdByDocument[row.payloadId];
        const publishedVersionId =
            row.document.status === 'published' ? history.publishedVersionIdByDocument[row.payloadId] : undefined;
        if (latestVersionId === undefined && publishedVersionId === undefined) return row;
        return {
            payloadId: row.payloadId,
            document: {
                ...row.document,
                ...(latestVersionId === undefined ? {} : { latestVersionId }),
                ...(publishedVersionId === undefined ? {} : { publishedVersionId }),
            },
        };
    });
