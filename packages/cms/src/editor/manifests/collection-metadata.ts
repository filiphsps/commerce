import type { Route } from 'next';
import { adminOnly, editorOrAdmin, tenantMember } from '../access';
import { defineCollectionEditor } from '../manifest';

export const collectionMetadataEditor = defineCollectionEditor({
    collection: 'collectionMetadata',
    routes: {
        label: { singular: 'Collection metadata', plural: 'Collection metadata' },
        basePath: (domain) => `/${domain}/content/collection-metadata/` as Route,
        keyField: 'shopifyHandle',
        breadcrumbs: ({ domain }) => [
            { label: 'Content', href: `/${domain}/content/` as Route },
            { label: 'Collection metadata' },
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
        return handle ? [`/${domain}/collections/${handle}/`] : [];
    },
});
