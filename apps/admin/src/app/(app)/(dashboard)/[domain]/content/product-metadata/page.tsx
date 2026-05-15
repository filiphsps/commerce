import 'server-only';

import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { CollectionTable } from '@/components/cms/collection-table';
import { CreateMetadataForHandleForm } from '@/components/cms/create-metadata-for-handle-form';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

export const metadata: Metadata = { title: 'Product Metadata' };

type Params = Promise<{ domain: string }>;

type MetadataRow = {
    id: string;
    shopifyHandle: string;
    status: string;
    updatedAt: string;
};

export default async function ProductMetadataListPage({ params }: { params: Params }) {
    const { domain } = await params;

    // ── Auth + tenant resolution ──────────────────────────────────────────────
    const { payload, user, tenant } = await getAuthedPayloadCtx(domain);

    if (!tenant) {
        return null;
    }

    // ── Fetch existing metadata docs scoped to this tenant ────────────────────
    // Only docs that already exist in Payload are shown. The "Open by handle"
    // form below lets operators navigate to (and implicitly create) a doc for
    // any handle — Shopify product-list integration is deferred to a future task.
    const { docs } = await payload.find({
        collection: 'productMetadata',
        where: { tenant: { equals: tenant.id } },
        sort: '-updatedAt',
        limit: 100,
        user,
        overrideAccess: false,
    });

    const rows: MetadataRow[] = docs.map((doc) => ({
        id: String(doc.id),
        shopifyHandle: doc.shopifyHandle,
        status: doc._status ?? 'draft',
        updatedAt: new Date(doc.updatedAt).toLocaleString(),
    }));

    const columns = [
        { key: 'shopifyHandle' as const, label: 'Handle' },
        { key: 'status' as const, label: 'Status' },
        { key: 'updatedAt' as const, label: 'Updated' },
    ];

    return (
        <div className="flex flex-col gap-6 px-6 py-8">
            <header className="flex items-center justify-between">
                <h1 className="font-semibold text-2xl">Product Metadata</h1>
            </header>

            <p className="text-muted-foreground text-sm">
                CMS metadata overlaid on Shopify products. Open an existing entry or enter a product handle below to
                create new metadata.
            </p>

            {/* ── Open-by-handle form ────────────────────────────────────────── */}
            <div className="flex items-center gap-3">
                <span className="font-medium text-sm">Open metadata for handle:</span>
                <CreateMetadataForHandleForm
                    domain={domain}
                    basePath="product-metadata"
                    placeholder="e.g. cool-sneakers"
                />
            </div>

            {/* ── Existing metadata table ────────────────────────────────────── */}
            <CollectionTable
                rows={rows}
                columns={columns}
                getRowHref={(row) =>
                    `/${domain}/content/product-metadata/${encodeURIComponent(row.shopifyHandle)}/` as Route
                }
                getRowLabel={(row) => row.shopifyHandle}
                emptyMessage="No product metadata yet. Enter a Shopify handle above to create the first entry."
                ariaLabel="Product Metadata"
            />
        </div>
    );
}
