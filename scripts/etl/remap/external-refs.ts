import type { ConvexImportDataset } from '../transform/index';

/**
 * INVARIANT — the public `shop.id` is `legacyId`, NOT the surrogate Convex id.
 *
 * A surrogate Convex id (`payloadId`) only ever links rows INSIDE the staged dataset; it never leaves
 * the deployment. Every shop reference that was persisted OUTSIDE the database — a Shopify webhook
 * payload, a Shopify metafield, a client cookie, or a cached/ISR/CDN response baked into a build — was
 * written against the PUBLIC `shop.id`, which the query layer projects from the immutable source
 * `ObjectId` preserved as `shops.legacyId`. The migration preserves `legacyId` verbatim, so the public
 * `shop.id` is byte-stable across the cut-over and these external references keep resolving with NO
 * rewrite. External refs therefore need only VERIFICATION — that every shop row still carries its
 * `legacyId` and that each externally-held id still resolves to exactly one live shop — never a remap.
 * Rewriting a surrogate id into any of these sinks would be a correctness bug: it would break the
 * moment a webhook/cookie/cached page minted before the cut-over arrives after it.
 */
export const EXTERNAL_SHOP_ID_SINKS = [
    'shopify-webhook-payload',
    'shopify-metafield',
    'client-cookie',
    'cached-isr-output',
] as const;

/** One externally-persisted shop reference sink whose `shop.id` must survive the migration unchanged. */
export type ExternalShopIdSink = (typeof EXTERNAL_SHOP_ID_SINKS)[number];

/**
 * Maps each live shop's PUBLIC id (`legacyId`) to its surrogate Convex id (`payloadId`). This is the
 * index an external reference resolves through: an inbound webhook/cookie/cached id is a `legacyId`,
 * and this index finds the live shop row it now denotes. A shop row missing its `legacyId` is skipped
 * (it cannot anchor a public id) and surfaces via {@link verifyLegacyIdsPreserved}. Pure.
 *
 * @param dataset - The staged Convex import dataset from `../transform`.
 * @returns A map from public `shop.id` (`legacyId`) to the live shop's surrogate id.
 */
export const buildPublicShopIdIndex = (dataset: ConvexImportDataset): Map<string, string> => {
    const index = new Map<string, string>();
    for (const row of dataset.shops) {
        const legacyId = row.document.legacyId;
        if (typeof legacyId === 'string' && legacyId.length > 0) index.set(legacyId, row.payloadId);
    }
    return index;
};

/**
 * Resolves an externally-persisted `shop.id` (always a `legacyId`) to the live shop's surrogate id, or
 * `null` when no shop row carries that `legacyId`. The contract is deliberately identity-on-the-public-id:
 * the external value is passed through unchanged and looked up, never rewritten. Pure.
 *
 * @param externalId - The shop id read from an external sink (webhook/metafield/cookie/cached output).
 * @param index - The public-id index from {@link buildPublicShopIdIndex}.
 * @returns The live shop's surrogate id, or `null` when the external id resolves to no shop.
 */
export const resolveExternalShopRef = (externalId: string, index: ReadonlyMap<string, string>): string | null =>
    index.get(externalId) ?? null;

/** Result of verifying that every shop row preserved a usable public id. */
export interface LegacyIdPreservation {
    ok: boolean;
    /** Surrogate ids of shop rows that are missing a non-empty `legacyId` (so their public id is lost). */
    missing: string[];
}

/**
 * Verifies acceptance #2 at the row level: every staged shop row carries a non-empty `legacyId` — the
 * value the public `shop.id` projects from — so no externally-persisted reference can be orphaned by a
 * lost public id. Pure.
 *
 * @param dataset - The staged Convex import dataset from `../transform`.
 * @returns `{ ok, missing }`; `ok` is true iff every shop row preserved its `legacyId`.
 */
export const verifyLegacyIdsPreserved = (dataset: ConvexImportDataset): LegacyIdPreservation => {
    const missing: string[] = [];
    for (const row of dataset.shops) {
        const legacyId = row.document.legacyId;
        if (typeof legacyId !== 'string' || legacyId.length === 0) missing.push(row.payloadId);
    }
    return { ok: missing.length === 0, missing };
};

/** Result of resolving a batch of externally-held shop ids against the migrated dataset. */
export interface ExternalRefResolution {
    ok: boolean;
    /** External ids that resolved to no live shop row (a dangling external reference). */
    unresolved: string[];
}

/**
 * Verifies that every externally-held `shop.id` still resolves to exactly one live shop after the
 * migration, proving the public-id contract held across the cut-over WITHOUT rewriting any external
 * value. Each id is looked up through the `legacyId` index unchanged. Pure.
 *
 * @param dataset - The staged Convex import dataset from `../transform`.
 * @param externalIds - Shop ids harvested from external sinks (webhooks/metafields/cookies/cached output).
 * @returns `{ ok, unresolved }`; `ok` is true iff every external id resolved to a live shop.
 */
export const verifyExternalShopRefs = (
    dataset: ConvexImportDataset,
    externalIds: readonly string[],
): ExternalRefResolution => {
    const index = buildPublicShopIdIndex(dataset);
    const unresolved: string[] = [];
    for (const externalId of externalIds) {
        if (resolveExternalShopRef(externalId, index) === null) unresolved.push(externalId);
    }
    return { ok: unresolved.length === 0, unresolved };
};
