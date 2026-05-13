import type { CollectionConfig } from 'payload';
import { adminOnly, publishedOrAuthRead, tenantScopedWrite } from '../../access';
import { imageField, linkField, navItemField } from '../../fields';
import { buildRevalidateHooks } from '../_hooks/revalidate';

export const header: CollectionConfig = {
    slug: 'header',
    versions: { drafts: { autosave: { interval: 2000 } } },
    access: {
        // Anonymous storefront reads are restricted to `_status: published` so
        // autosaved drafts (every 2s while an editor types) don't leak to
        // public visitors.
        read: publishedOrAuthRead,
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
    // No explicit `tenant` index: @payloadcms/plugin-multi-tenant adds a unique
    // tenant index automatically when `isGlobal: true` is set on the collection.
    hooks: buildRevalidateHooks({ collection: 'header' }),
};
