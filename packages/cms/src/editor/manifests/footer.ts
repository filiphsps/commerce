import type { Route } from 'next';
import { adminOnly, editorOrAdmin, tenantMember } from '../access';
import { defineCollectionEditor } from '../manifest';

export const footerEditor = defineCollectionEditor({
    collection: 'footer',
    routes: {
        label: { singular: 'Footer', plural: 'Footer' },
        basePath: (domain) => `/${domain}/content/footer/` as Route,
        breadcrumbs: ({ domain }) => [{ label: 'Content', href: `/${domain}/content/` as Route }, { label: 'Footer' }],
    },
    tenant: { kind: 'scoped', field: 'tenant' },
    access: {
        list: tenantMember,
        read: tenantMember,
        update: editorOrAdmin,
        delete: adminOnly,
    },
    revalidate: ({ domain }) => [`/${domain}/content/footer/`],
});
