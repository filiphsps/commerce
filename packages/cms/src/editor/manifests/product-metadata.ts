import type { Route } from 'next';
import { adminOnly, editorOrAdmin, tenantMember } from '../access';
import { defineCollectionEditor } from '../manifest';

export const productMetadataEditor = defineCollectionEditor({
    collection: 'productMetadata',
    routes: {
        label: { singular: 'Product metadata', plural: 'Product metadata' },
        basePath: (domain) => `/${domain}/content/product-metadata/` as Route,
        keyField: 'shopifyHandle',
        breadcrumbs: ({ domain }) => [
            { label: 'Content', href: `/${domain}/content/` as Route },
            { label: 'Product metadata' },
        ],
    },
    tenant: { kind: 'scoped', field: 'tenant' },
    access: {
        list: tenantMember,
        read: tenantMember,
        create: editorOrAdmin,
        update: editorOrAdmin,
        delete: adminOnly,
    },
    revalidate: ({ domain, doc }) => {
        const handle = (doc as { shopifyHandle?: string } | null)?.shopifyHandle;
        return handle ? [`/${domain}/products/${handle}/`] : [];
    },
});
