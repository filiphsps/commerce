import type { CollectionConfig } from 'payload';
import { adminOnly, tenantScopedRead, tenantScopedWrite } from '../access';
import { allBlocks } from '../blocks';
import { toFieldConfigs } from '../field-config-bridge';
import { seoGroup } from '../fields';
import { buildRevalidateHooks } from './_hooks/revalidate';

/**
 * Payload collection config for `pages`. Tenant-scoped CMS pages with
 * draft/autosave/version support, a block-based body, and an SEO group. The
 * `(tenant, slug)` compound index enforces per-tenant slug uniqueness.
 */
export const pages: CollectionConfig = {
    slug: 'pages',
    versions: { drafts: { autosave: { interval: 2000 } } },
    admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', '_status', 'updatedAt'] },
    access: {
        read: tenantScopedRead,
        create: tenantScopedWrite,
        update: tenantScopedWrite,
        delete: adminOnly,
    },
    fields: toFieldConfigs(
        { name: 'title', type: 'text', required: true, localized: true },
        { name: 'slug', type: 'text', required: true, index: true },
        { name: 'blocks', type: 'blocks', blocks: allBlocks },
        seoGroup(),
    ),
    indexes: [{ fields: ['tenant', 'slug'], unique: true }],
    hooks: buildRevalidateHooks({ collection: 'pages' }),
};
