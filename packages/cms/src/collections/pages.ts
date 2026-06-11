import type { CollectionConfig } from 'payload';
import { convexCutoverLocked, tenantScopedRead } from '../access';
import { allBlocks } from '../blocks';
import { localized, required, textField } from '../descriptors';
import { toFieldConfigs } from '../field-config-bridge';
import { seoGroup } from '../fields';
import { buildRevalidateHooks } from './_hooks/revalidate';

/**
 * Payload collection config for `pages`. Tenant-scoped CMS pages with
 * draft/autosave/version support, a block-based body, and an SEO group. The
 * `(tenant, slug)` compound index enforces per-tenant slug uniqueness.
 *
 * CUTOVER-04: authoring lives in the Convex-native editor; every Payload write
 * operation is `convexCutoverLocked` so the inert Mongo snapshot can never fork
 * from the Convex authority. Reads stay tenant-scoped for the storefront's
 * emergency-shadow leg until TEARDOWN-02 removes the collection entirely.
 */
export const pages: CollectionConfig = {
    slug: 'pages',
    versions: { drafts: { autosave: { interval: 2000 } } },
    admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', '_status', 'updatedAt'], hidden: true },
    access: {
        read: tenantScopedRead,
        create: convexCutoverLocked,
        update: convexCutoverLocked,
        delete: convexCutoverLocked,
    },
    fields: toFieldConfigs(
        localized(required(textField({ name: 'title' }))),
        // `index` is unmodeled by the descriptor DSL; raw field via the bridge.
        { name: 'slug', type: 'text', required: true, index: true },
        // `allBlocks` are Payload block configs owned by the blocks module; the
        // polymorphic field is passed through raw rather than re-wrapped.
        { name: 'blocks', type: 'blocks', blocks: allBlocks },
        seoGroup(),
    ),
    indexes: [{ fields: ['tenant', 'slug'], unique: true }],
    hooks: buildRevalidateHooks({ collection: 'pages' }),
};
