import type { CollectionConfig } from 'payload';
import { adminOnly, publicRead, tenantScopedWrite } from '../../access';
import { imageField, linkField, navItemField } from '../../fields';

export const header: CollectionConfig = {
    slug: 'header',
    versions: { drafts: { autosave: { interval: 2000 } } },
    access: {
        read: publicRead,
        create: tenantScopedWrite,
        update: tenantScopedWrite,
        delete: adminOnly,
    },
    fields: [
        imageField({ name: 'logo' }),
        { name: 'logoLink', type: 'text', defaultValue: '/' },
        navItemField({ depth: 3 }),
        {
            name: 'localeSwitcher',
            type: 'group',
            fields: [
                { name: 'enabled', type: 'checkbox', defaultValue: true },
                { name: 'label', type: 'text', localized: true },
            ],
        },
        linkField({ name: 'cta' }),
    ],
    indexes: [{ fields: ['tenant'], unique: true }],
};
