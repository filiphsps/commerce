import type { Route } from 'next';
import { adminOnly, editorOrAdmin, tenantMember } from '../access';
import { defineCollectionEditor } from '../manifest';

/** Editor manifest for the `header` global. Tenant-singleton; one header per tenant with draft support. */
export const headerEditor = defineCollectionEditor({
    collection: 'header',
    routes: {
        label: { singular: 'Header', plural: 'Header' },
        description: 'Logo, navigation, CTA, locale switcher.',
        basePath: (domain) => `/${domain}/content/header/` as Route,
        breadcrumbs: ({ domain }) => [{ label: 'Content', href: `/${domain}/content/` as Route }, { label: 'Header' }],
    },
    tenant: { kind: 'tenant-singleton', field: 'tenant' },
    access: {
        list: tenantMember,
        read: tenantMember,
        update: editorOrAdmin,
        delete: adminOnly,
    },
    revalidate: ({ domain }) => [`/${domain}/content/header/`],
});
