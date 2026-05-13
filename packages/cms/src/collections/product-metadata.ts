import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { CollectionConfig } from 'payload';
import { adminOnly, tenantScopedRead, tenantScopedWrite } from '../access';
import { allBlocks } from '../blocks';
import { seoGroup } from '../fields';
import { buildRevalidateHooks } from './_hooks/revalidate';

export const productMetadata: CollectionConfig = {
    slug: 'productMetadata',
    versions: { drafts: { autosave: { interval: 2000 } } },
    admin: { useAsTitle: 'shopifyHandle', defaultColumns: ['shopifyHandle', 'tenant', '_status'] },
    access: {
        read: tenantScopedRead,
        create: tenantScopedWrite,
        update: tenantScopedWrite,
        delete: adminOnly,
    },
    fields: [
        {
            name: 'shopifyHandle',
            type: 'text',
            required: true,
            index: true,
            admin: { description: 'Shopify product handle this CMS metadata overlays' },
        },
        { name: 'descriptionOverride', type: 'richText', localized: true, editor: lexicalEditor({}) },
        { name: 'blocks', type: 'blocks', blocks: allBlocks },
        seoGroup(),
    ],
    indexes: [{ fields: ['tenant', 'shopifyHandle'], unique: true }],
    hooks: buildRevalidateHooks({ collection: 'productMetadata' }),
};
