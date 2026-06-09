import { cmsCacheSchema } from '@nordcom/commerce-cms/cache-descriptor';

import { cmsRevalidateKey } from '../revalidate/onPublish';
import { deriveRevalidateTags } from '../revalidate/tags';

/**
 * Every CMS collection the editor can publish, read straight from the shared
 * {@link cmsCacheSchema} taxonomy (sorted for stable comparison). This is the CMSDATA-08
 * completeness contract: the publish feed recognizes exactly the collections the read side caches —
 * a collection published outside this list falls back to the tenant-root sweep rather than a
 * guessed tag, and a new cache entity automatically joins the feed without a second registry.
 * Media is deliberately absent: uploads flow through `cms/media.ts`, never the publish mutation.
 */
export const PUBLISHABLE_CMS_COLLECTIONS: readonly string[] = Object.freeze(
    Object.keys(cmsCacheSchema.schema.entities).sort(),
);

/**
 * Derives the storefront cache tags a publish busts, composing the exact two steps the live publish
 * path runs: `cms/documents.ts` extracts the document's leaf key via {@link cmsRevalidateKey} when
 * scheduling `revalidate/onPublish`, which then derives tags via {@link deriveRevalidateTags}
 * (BRIDGE-03) — the single tag vocabulary, shared with the Next.js read adapter through
 * {@link cmsCacheSchema}. Pure and scheduler-free, so the per-collection feed is assertable
 * end-to-end (collection + raw document data → tags) without booting a Convex runtime. The draft
 * counterpart is intentionally absent: a draft/autosave save schedules no `onPublish` at all
 * (pinned by `cms/actions.test.ts`'s never-schedule-notify case), so there is no draft feed.
 *
 * @param args - The published document's `collection` slug, its serialized `data` (leaf-key
 *   source), and the bridge `tenantId` (the shop's STRING legacy id).
 * @returns The cache tags to revalidate, leaf-to-root, identical to what the scheduled publish
 *   hook hands the revalidation bridge.
 */
export function publishFeedTags(args: { collection: string; data: unknown; tenantId: string }): string[] {
    const { collection, data, tenantId } = args;
    return deriveRevalidateTags({ collection, key: cmsRevalidateKey(collection, data), tenantId });
}
