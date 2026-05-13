import type { CollectionConfig } from 'payload';
import { adminOnly, publicRead, tenantScopedWrite } from '../../access';
import { linkField } from '../../fields';
import { buildRevalidateHooks } from '../_hooks/revalidate';

export const footer: CollectionConfig = {
    slug: 'footer',
    versions: { drafts: { autosave: { interval: 2000 } } },
    access: {
        read: publicRead,
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
                { name: 'links', type: 'array', fields: [linkField({ name: 'link' })] },
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
        { name: 'legal', type: 'array', fields: [linkField({ name: 'link' })] },
        { name: 'copyrightLine', type: 'text', localized: true },
    ],
    indexes: [{ fields: ['tenant'], unique: true }],
    hooks: buildRevalidateHooks({ collection: 'footer' }),
};
