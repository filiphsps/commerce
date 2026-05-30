import type { CollectionConfig } from 'payload';
import { adminOnly, publishedOrAuthRead, tenantScopedWrite } from '../../access';
import { toFieldConfigs } from '../../field-config-bridge';
import { linkField } from '../../fields';
import { buildRevalidateHooks } from '../_hooks/revalidate';

/**
 * Payload collection config for the `footer` singleton. Stores navigation
 * sections, social links, legal links, and a copyright line. One document per
 * tenant, managed by the multi-tenant plugin.
 */
export const footer: CollectionConfig = {
    slug: 'footer',
    versions: { drafts: { autosave: { interval: 2000 } } },
    access: {
        // See header.ts for rationale — autosaved drafts must not leak to anon
        // storefront reads.
        read: publishedOrAuthRead,
        create: tenantScopedWrite,
        update: tenantScopedWrite,
        delete: adminOnly,
    },
    fields: [
        {
            name: 'sections',
            type: 'array',
            fields: [
                { name: 'title', type: 'text', localized: true, required: true },
                { name: 'links', type: 'array', fields: toFieldConfigs(linkField({ name: 'link' })) },
            ],
        },
        {
            name: 'social',
            type: 'array',
            fields: [
                {
                    name: 'platform',
                    type: 'select',
                    required: true,
                    options: [
                        { label: 'Instagram', value: 'instagram' },
                        { label: 'Facebook', value: 'facebook' },
                        { label: 'TikTok', value: 'tiktok' },
                        { label: 'YouTube', value: 'youtube' },
                        { label: 'X / Twitter', value: 'x' },
                        { label: 'LinkedIn', value: 'linkedin' },
                    ],
                },
                { name: 'url', type: 'text', required: true },
            ],
        },
        { name: 'legal', type: 'array', fields: toFieldConfigs(linkField({ name: 'link' })) },
        { name: 'copyrightLine', type: 'text', localized: true },
    ],
    // No explicit `tenant` index: the multi-tenant plugin owns it for globals.
    hooks: buildRevalidateHooks({ collection: 'footer' }),
};
