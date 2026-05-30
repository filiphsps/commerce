import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { CollectionConfig } from 'payload';
import { adminOnly, tenantScopedRead, tenantScopedWrite } from '../access';
import { allBlocks } from '../blocks';
import { toFieldConfigs } from '../field-config-bridge';
import { seoGroup } from '../fields';
import { buildRevalidateHooks } from './_hooks/revalidate';

/**
 * Payload collection config for `productMetadata`. Stores CMS enrichment
 * (description override, blocks, SEO) keyed to a Shopify product handle.
 * The `(tenant, shopifyHandle)` compound index enforces per-tenant handle
 * uniqueness.
 */
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
    fields: toFieldConfigs(
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
    ),
    indexes: [{ fields: ['tenant', 'shopifyHandle'], unique: true }],
    hooks: buildRevalidateHooks({ collection: 'productMetadata' }),
};
