/**
 * Expected-side (Mongo→transform) canonical checksums for the PIPELINE-04 reconciliation gate.
 *
 * Builds, per collection, the canonical checksum of the FULL document set (never sampled) the Convex
 * deployment is expected to hold after import: the raw mongoexport corpus runs through the REAL
 * PIPELINE-01/02 transforms (`../transform`), each staged row is projected to its logical document,
 * and the shared checksum core (`packages/convex/convex/lib/checksum.ts` — the SAME canonicalization
 * and hashing the in-Convex sweep uses) produces per-document hashes plus a per-collection
 * Merkle-ish rollup. `convex/reconcile.ts`'s `run` action compares its Convex-side sweep against
 * these results and writes the divergence ledger.
 *
 * Canonicalization of volatile state (the cross-side determinism contract; the Convex side mirrors
 * every rule in `convex/reconcile.ts`'s `checksumPage`):
 * - Convex's `_id`/`_creationTime` never exist on staged documents and are STRIPPED from live rows —
 *   both are deployment-issued and change on every import.
 * - id-reference columns (`shop`, `shopId`, `flag`) are mapped to the referenced row's stable
 *   `legacyId`: the staged side resolves its PIPELINE-01 surrogate ids through the transform output
 *   (the inverse of the id-remap), the Convex side resolves its live ids through a point read. A
 *   dangling reference maps to the fixed `missing:<table>` token on both sides.
 * - timestamps are the source-preserved numeric epoch-ms `createdAt`/`updatedAt` columns, carried
 *   verbatim (already normalized by the transform's extended-JSON pass), so they hash deterministically.
 * - shredded CMS documents are checksummed as LOGICAL documents: inline data plus every `cms_i18n`
 *   side row reassembled — here through the clean-room `./independent-reassembly` implementation,
 *   NOT the runtime shred module, so a shred/reassembly transform bug diverges instead of agreeing
 *   wrong (see that module's doc).
 *
 * `shopCollaborators` is deliberately outside this corpus: its `user` ref points into the auth
 * family, which has no stable cross-side identity yet (no `legacyId`, not in the export); the
 * PIPELINE-03 reference-integrity verifier covers those edges. `cmsVersions` likewise stays with the
 * PIPELINE-02/03 gates. Both exclusions are mirrored by `convex/reconcile.ts`'s `RECONCILE_TABLES`.
 */
import { checksumDocument, rollupChecksum } from '../../../packages/convex/convex/lib/checksum';
import { type Doc, type SourceDataset, type TransformedDoc, transform } from '../transform/index';
import { transformCmsDocuments } from '../transform/shred-richtext';
import { groupSideRowsByParent, independentReassembly, type ShreddedSideRowRecord } from './independent-reassembly';

/**
 * One collection's expected checksum result: the Merkle-ish rollup over the sorted per-document
 * hashes, the exact document count, and the FULL per-document hash list (the locator a divergence
 * is narrowed with; the in-Convex ledger stores only bounded samples of it).
 */
export interface CollectionChecksum {
    /** The ledger collection key: a core table name, or `cmsDocuments:<slug>` for a CMS collection. */
    collection: string;
    /** SHA-256 rollup of the sorted `docHashes` (see `rollupChecksum`). */
    rollup: string;
    /** Number of documents in the collection's full set. */
    count: number;
    /** Per-document canonical checksums, in staged order. */
    docHashes: string[];
}

/** The raw mongoexport documents of each CMS collection to include, keyed by collection slug. */
export type CmsSourceCollections = Record<string, readonly Doc[]>;

/**
 * Builds the `surrogateId → legacyId` map for a transformed table whose rows preserve their source
 * Mongo id as `legacyId` — the inverse of the PIPELINE-01 id-remap, used to project id references to
 * stable identities. Pure.
 *
 * @param rows - The table's transformed rows.
 * @returns Surrogate `payloadId` → the row's `legacyId`.
 */
function legacyIdMap(rows: readonly TransformedDoc[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const row of rows) {
        if (typeof row.document.legacyId === 'string') map.set(row.payloadId, row.document.legacyId);
    }
    return map;
}

/**
 * Resolves a staged surrogate reference to its stable identity, with the same deterministic
 * `missing:<table>` token the Convex-side resolver emits for a dangling reference.
 *
 * @param map - The table's surrogate→legacy map.
 * @param table - The referenced table (names the missing-token).
 * @param surrogateId - The staged surrogate id to resolve.
 * @returns The referenced row's `legacyId`, or the missing token.
 */
function resolveLegacy(map: Map<string, string>, table: string, surrogateId: unknown): string {
    return (typeof surrogateId === 'string' ? map.get(surrogateId) : undefined) ?? `missing:${table}`;
}

/**
 * Checksums one collection's logical documents into its {@link CollectionChecksum}.
 *
 * @param collection - The ledger collection key.
 * @param docs - The collection's logical documents, in staged order.
 * @returns The collection's checksum result.
 */
async function checksumCollection(
    collection: string,
    docs: readonly Record<string, unknown>[],
): Promise<CollectionChecksum> {
    const docHashes: string[] = [];
    for (const doc of docs) {
        docHashes.push(await checksumDocument(doc));
    }
    return { collection, rollup: await rollupChecksum(docHashes), count: docs.length, docHashes };
}

/**
 * Computes the expected per-collection checksums for the core (PIPELINE-01) corpus plus any supplied
 * CMS collections (PIPELINE-02), over the FULL document set of every covered collection. This is the
 * value handed to `convex/reconcile.ts`'s `run` action as `expected`.
 *
 * @param source - The raw mongoexport source dataset (the PIPELINE-01 collections).
 * @param cms - Raw mongoexport documents per CMS collection slug; omit for a core-only corpus.
 * @returns The expected checksums, sorted by collection key.
 */
export async function expectedChecksums(
    source: SourceDataset,
    cms: CmsSourceCollections = {},
): Promise<CollectionChecksum[]> {
    const dataset = transform(source);
    const shopLegacy = legacyIdMap(dataset.shops);
    const flagLegacy = legacyIdMap(dataset.featureFlags);

    const results: CollectionChecksum[] = [
        await checksumCollection(
            'shops',
            dataset.shops.map((row) => row.document),
        ),
        await checksumCollection(
            'shopCredentials',
            dataset.shopCredentials.map((row) => ({
                ...row.document,
                shop: resolveLegacy(shopLegacy, 'shops', row.document.shop),
            })),
        ),
        await checksumCollection(
            'shopDomains',
            dataset.shopDomains.map((row) => ({
                ...row.document,
                shop: resolveLegacy(shopLegacy, 'shops', row.document.shop),
            })),
        ),
        await checksumCollection(
            'shopFeatureFlags',
            dataset.shopFeatureFlags.map((row) => ({
                ...row.document,
                shop: resolveLegacy(shopLegacy, 'shops', row.document.shop),
                flag: resolveLegacy(flagLegacy, 'featureFlags', row.document.flag),
            })),
        ),
        await checksumCollection(
            'featureFlags',
            dataset.featureFlags.map((row) => row.document),
        ),
        await checksumCollection(
            'reviews',
            dataset.reviews.map((row) => ({
                ...row.document,
                shopId: resolveLegacy(shopLegacy, 'shops', row.document.shopId),
            })),
        ),
    ];

    for (const [slug, raws] of Object.entries(cms)) {
        const staged = transformCmsDocuments(slug, raws);
        const sideRowsByParent = groupSideRowsByParent(
            staged.cms_i18n.map(
                (row): ShreddedSideRowRecord => ({
                    parentId: String(row.document.parentId),
                    fieldPath: String(row.document.fieldPath),
                    locale: String(row.document.locale),
                    value: row.document.value,
                }),
            ),
        );
        const docs = staged.cmsDocuments.map((row) => {
            const sideRows = sideRowsByParent.get(row.payloadId) ?? [];
            return {
                ...row.document,
                shopId: resolveLegacy(shopLegacy, 'shops', row.document.shopId),
                data: independentReassembly(row.document.data, sideRows),
            };
        });
        results.push(await checksumCollection(`cmsDocuments:${slug}`, docs));
    }

    return results.sort((left, right) => (left.collection < right.collection ? -1 : 1));
}
