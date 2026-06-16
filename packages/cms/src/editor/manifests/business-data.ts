import type { Route } from 'next';
import { adminOnly, editorOrAdmin, tenantMember } from '../access';
import { defineCollectionEditor } from '../manifest';

/**
 * Editor manifest for the `businessData` global. One row per tenant; drafts +
 * autosave + versions + locales come from the collection's own `versions` and
 * localized field config.
 */
export const businessDataEditor = defineCollectionEditor({
    collection: 'businessData',
    routes: {
        label: { singular: 'Business data', plural: 'Business data' },
        description: 'Legal name, support contact, address, social profiles.',
        basePath: (domain) => `/${domain}/content/business-data/` as Route,
        breadcrumbs: ({ domain }) => [
            { label: 'Content', href: `/${domain}/content/` as Route },
            { label: 'Business data' },
        ],
    },
    tenant: { kind: 'tenant-singleton', field: 'tenant' },
    access: {
        list: tenantMember,
        read: tenantMember,
        update: editorOrAdmin,
        delete: adminOnly,
    },
    revalidate: ({ domain }) => [`/${domain}/content/business-data/`],
});
