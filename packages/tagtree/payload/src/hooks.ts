import type { CacheInstance, EntitiesMap } from '@tagtree/core';
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionConfig } from 'payload';

type Doc = {
    id: string | number;
    slug?: string;
    shopifyHandle?: string;
    tenant?: string | { id: string };
    _status?: 'draft' | 'published';
};

/**
 * Extracts the tenant ID from a document, normalizing both the scalar string form and the object form Payload uses when relationship fields are expanded.
 *
 * @param doc - Document delivered by a Payload collection hook.
 * @returns The tenant's ID string, or `undefined` when the document has no tenant field.
 */
const tenantId = (doc: Doc): string | undefined => {
    if (!doc.tenant) return undefined;
    return typeof doc.tenant === 'string' ? doc.tenant : doc.tenant.id;
};

/**
 * Derives the cache-invalidation key for a document, preferring a stable content-addressable slug over a Shopify handle and falling back to the numeric or string ID.
 *
 * @param doc - Document delivered by a Payload collection hook.
 * @returns The slug, Shopify handle, or stringified ID — in that priority order.
 */
const docKey = (doc: Doc): string => doc.slug ?? doc.shopifyHandle ?? String(doc.id);

/**
 * Configuration bag for `payloadHooks`, specifying which entity in the tagtree cache schema to target for invalidation and how draft-status transitions are gated.
 *
 * @example
 * ```ts
 * const opts: PayloadHooksOptions = { entity: 'products', gatePublishedDrafts: true };
 * const hooks = payloadHooks(cache, opts);
 * ```
 */
export interface PayloadHooksOptions {
    entity: string;
    /**
     * When true (default), `afterChange` only fires invalidation for docs whose
     * `_status === 'published'`. Without this gate, Payload's autosave cadence
     * (every ~2 seconds for draft-enabled collections) would burst-invalidate
     * production cache on every keystroke. Drafts are invisible to anonymous
     * reads anyway, so there's nothing to invalidate.
     *
     * Set to `false` for collections without drafts (e.g., globals like header,
     * footer) where every change is implicitly published.
     */
    gatePublishedDrafts?: boolean;
}

/**
 * Creates Payload CMS `afterChange` and `afterDelete` collection hooks that invalidate the tagtree cache whenever a document is saved or removed.
 *
 * @param cache - Typed tagtree `CacheInstance` holding the entity schema and invalidation logic.
 * @param opts - Controls which entity to invalidate and whether draft-status gating is applied.
 * @returns A `CollectionConfig['hooks']` object with `afterChange` and `afterDelete` handlers ready to merge into a collection config.
 * @throws {Error} When `opts.entity` does not name a key declared in the cache schema.
 * @example
 * ```ts
 * const productCollection: CollectionConfig = {
 *     slug: 'products',
 *     hooks: payloadHooks(cache, { entity: 'products', gatePublishedDrafts: true }),
 * };
 * ```
 */
export function payloadHooks<NS extends string, T extends string | { id: string }, Q, E extends EntitiesMap>(
    cache: CacheInstance<NS, T, Q, E>,
    opts: PayloadHooksOptions,
): NonNullable<CollectionConfig['hooks']> {
    const gate = opts.gatePublishedDrafts ?? true;

    const invalidate = async (doc: Doc) => {
        const tid = tenantId(doc);
        if (!tid) return;
        const invalidator = (cache.invalidate as Record<string, unknown>)[opts.entity];
        if (typeof invalidator !== 'function') {
            throw new Error(`@tagtree/payload: entity "${opts.entity}" is not declared in the cache schema`);
        }
        // The schema models each CMS collection as having a single 'key' param
        // (slug, shopifyHandle, or id fallback). Pass it as `key` and let
        // computeFanout emit the correct tag set.
        await (invalidator as (arg: { tenant: T; key: string }) => Promise<void>)({
            tenant: tid as T,
            key: docKey(doc),
        });
    };

    const afterChange: CollectionAfterChangeHook = async ({ doc }) => {
        const d = doc as Doc;
        // Skip non-published transitions on draft-gated collections. The
        // existence-check on `_status` matters: collections without drafts
        // (header, footer, etc.) have no `_status` field and should always
        // invalidate.
        if (gate && d._status !== undefined && d._status !== 'published') {
            return doc;
        }
        await invalidate(d);
        return doc;
    };

    const afterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
        await invalidate(doc as Doc);
    };

    return { afterChange: [afterChange], afterDelete: [afterDelete] };
}
