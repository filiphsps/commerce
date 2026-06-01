import { type CmsTenant, cmsCacheSchema, cmsTenantRootTags } from '@nordcom/commerce-cms/cache-descriptor';
import { computeFanout } from '@tagtree/core';

/**
 * A CMS publish event, reduced to the fields that determine which storefront cache
 * tags it busts. This is the in-Convex analog of the Next-side webhook parse: the
 * tags are derived where the write happened (Convex), so the revalidation bridge
 * never has to resolve a shop by domain or call back into Mongo.
 *
 * @property collection - The CMS collection that changed; one of the seven CMS entity names (`pages`, `articles`, `header`, `footer`, `businessData`, `productMetadata`, `collectionMetadata`). A value not declared in the CMS taxonomy — or omitted — is treated as a broad, tenant-wide publish.
 * @property key - The changed document's entity key (slug/handle). Omit for a collection-level publish (no leaf tag) or a broad publish.
 * @property tenantId - The Convex tenant (shop) id the event belongs to; prefixes every derived tag.
 */
export type CmsPublishEvent = {
    collection?: string;
    key?: string;
    tenantId: string;
};

/**
 * The CMS entity declarations, read once from the shared {@link cmsCacheSchema}. Membership in this
 * map is the test for whether a publish targets a specific CMS entity or is a broad tenant sweep.
 */
const cmsEntities = cmsCacheSchema.schema.entities;

/**
 * Derives the exact set of storefront cache tags a CMS publish event should revalidate, matching the
 * fanout the read side stamped via `cmsCache` for the same entity, key, and tenant.
 *
 * Pure and deterministic — no IO, no clock, no tenant lookup — so it is safe to run inside a Convex
 * mutation/action and trivially unit-testable. It derives tags from the SAME {@link cmsCacheSchema}
 * and {@link computeFanout} the Next.js read adapter uses, which is what guarantees the busted tags
 * line up byte-for-byte with the read tags.
 *
 * A publish whose `collection` is one of the seven CMS entities expands to that entity's full fanout
 * (leaf tag included only when `key` is present, exactly as `cmsCache.keys.<entity>` would). Any other
 * publish — an absent collection, or one outside the CMS taxonomy (e.g. a tenant-wide signal) — falls
 * back to {@link cmsTenantRootTags}, busting the whole tenant's CMS surface rather than guessing.
 *
 * @param event - The reduced CMS publish event to derive tags from.
 * @returns The cache tags to revalidate, ordered leaf-to-root, suitable for the Convex→Next revalidation payload.
 */
export function deriveRevalidateTags({ collection, key, tenantId }: CmsPublishEvent): string[] {
    const tenant: CmsTenant = { id: tenantId };

    if (collection !== undefined && collection in cmsEntities) {
        const params: Record<string, string> = key !== undefined ? { key } : {};
        return computeFanout(cmsCacheSchema.schema, { entity: collection, tenant, params });
    }

    return cmsTenantRootTags(tenant);
}
