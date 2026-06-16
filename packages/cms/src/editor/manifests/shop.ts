import type { Route } from 'next';
import { adminOnly, tenantMember } from '../access';
import { defineCollectionEditor } from '../manifest';

/**
 * Editor manifest for the `shops` collection — the unified Shop settings surface (UNIFY-SHOP).
 * Singleton per domain: the URL segment IS the domain, and `tenant.kind: 'singleton-by-domain'`
 * resolves the routed tenant. Unlike the content collections, this surface writes the REAL `shops`
 * row (through the `cms/shop_config` Convex functions the admin bridge routes `shops` to), not a
 * `cmsDocuments` singleton — so brand identity, default locale, primary domain, brand assets, and
 * business data are all edited here against the row the storefront actually reads.
 *
 * Read is gated to tenant members (any logged-in user belonging to this tenant); update/delete are
 * admin-only. The surface mutates only the editable subset; secret commerce-provider tokens never
 * reach it.
 */
export const shopsEditor = defineCollectionEditor({
    collection: 'shops',
    routes: {
        label: { singular: 'Shop', plural: 'Shops' },
        description: 'Brand identity, default locale, primary domain, logo & favicon, and business data.',
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
