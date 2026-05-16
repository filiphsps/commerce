import type { Route } from 'next';
import { adminOnly, tenantMember } from '../access';
import { defineCollectionEditor } from '../manifest';

/**
 * Editor manifest for the `shops` collection. Singleton per domain — the URL
 * segment IS the domain, and the manifest's `tenant.kind: 'singleton-by-domain'`
 * resolves `where: { or: [{ domain }, { alternativeDomains contains }] }`.
 *
 * Read is gated to tenant members (any logged-in user belonging to this
 * tenant); update/delete are admin-only. Editing a shop here only mutates the
 * editable subset (name, domain, design); secret commerce-provider tokens are
 * blocked at the collection's beforeChange hook.
 */
export const shopsEditor = defineCollectionEditor({
    collection: 'shops',
    routes: {
        label: { singular: 'Shop', plural: 'Shops' },
        basePath: (domain) => `/${domain}/settings/shop/` as Route,
        keyField: 'domain',
        breadcrumbs: ({ domain }) => [{ label: 'Settings', href: `/${domain}/settings/` as Route }, { label: 'Shop' }],
    },
    tenant: { kind: 'singleton-by-domain' },
    access: {
        list: () => false,
        read: tenantMember,
        update: adminOnly,
        delete: adminOnly,
    },
    revalidate: ({ domain }) => [`/${domain}/`, `/${domain}/settings/shop/`],
});
