import type { CollectionConfig } from 'payload';
import { adminOnly, tenantScopedRead, tenantScopedWrite } from '../access';
import { allBlocks } from '../blocks';
import { seoGroup } from '../fields';

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
    fields: [
        { name: 'title', type: 'text', required: true, localized: true },
        { name: 'slug', type: 'text', required: true, index: true },
        { name: 'blocks', type: 'blocks', blocks: allBlocks },
        seoGroup(),
    ],
    indexes: [{ fields: ['tenant', 'slug'], unique: true }],
};
