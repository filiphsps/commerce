import type { CollectionConfig } from 'payload';
import { convexCutoverLocked, tenantScopedRead } from '../access';
import { allBlocks } from '../blocks';
import { toFieldConfigs } from '../field-config-bridge';
import { seoGroup } from '../fields';
import { buildRevalidateHooks } from './_hooks/revalidate';

/**
 * Payload collection config for `collectionMetadata`. Stores CMS enrichment
 * (description override, blocks, SEO) keyed to a Shopify collection handle.
 * The `(tenant, shopifyHandle)` compound index enforces per-tenant handle
 * uniqueness.
 *
 * CUTOVER-05: authoring lives in the Convex-native editor (handle-keyed
 * routes); every Payload write operation is `convexCutoverLocked` so the inert
 * Mongo snapshot can never fork from the Convex authority. Reads stay
 * tenant-scoped for the storefront's emergency-shadow leg until TEARDOWN-02
 * removes the collection entirely.
 */
export const collectionMetadata: CollectionConfig = {
    slug: 'collectionMetadata',
    versions: { drafts: { autosave: { interval: 2000 } } },
    admin: { useAsTitle: 'shopifyHandle', defaultColumns: ['shopifyHandle', 'tenant', '_status'], hidden: true },
    access: {
        read: tenantScopedRead,
        create: convexCutoverLocked,
        update: convexCutoverLocked,
        delete: convexCutoverLocked,
    },
    fields: toFieldConfigs(
        { name: 'shopifyHandle', type: 'text', required: true, index: true },
        { name: 'descriptionOverride', type: 'json', localized: true },
        { name: 'blocks', type: 'blocks', blocks: allBlocks },
        seoGroup(),
    ),
    indexes: [{ fields: ['tenant', 'shopifyHandle'], unique: true }],
    hooks: buildRevalidateHooks({ collection: 'collectionMetadata' }),
};
