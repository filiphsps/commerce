import type { Route } from 'next';
import { adminOnly, editorOrAdmin, tenantMember } from '../access';
import { defineCollectionEditor } from '../manifest';

export const headerEditor = defineCollectionEditor({
    collection: 'header',
    routes: {
        label: { singular: 'Header', plural: 'Header' },
        basePath: (domain) => `/${domain}/content/header/` as Route,
        breadcrumbs: ({ domain }) => [{ label: 'Content', href: `/${domain}/content/` as Route }, { label: 'Header' }],
    },
    tenant: { kind: 'scoped', field: 'tenant' },
    access: {
        list: tenantMember,
        read: tenantMember,
        update: editorOrAdmin,
        delete: adminOnly,
    },
    revalidate: ({ domain }) => [`/${domain}/content/header/`],
});
