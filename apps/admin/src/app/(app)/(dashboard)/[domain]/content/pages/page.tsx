import 'server-only';

import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { BulkActions } from '@/components/cms/bulk-actions';
import { CollectionTable } from '@/components/cms/collection-table';
import { bulkDeletePagesAction, bulkPublishPagesAction } from '@/lib/cms-actions/pages';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

export const metadata: Metadata = { title: 'Pages' };

type Params = Promise<{ domain: string }>;

type PageRow = {
    id: string;
    title: string;
    slug: string;
    status: string;
    updatedAt: string;
};

export default async function PagesListPage({ params }: { params: Params }) {
    const { domain } = await params;

    // ── Auth + tenant resolution ──────────────────────────────────────────────
    const { payload, user, tenant } = await getAuthedPayloadCtx(domain);

    if (!tenant) {
        return null;
    }

    // ── Fetch pages scoped to this tenant ─────────────────────────────────────
    const { docs } = await payload.find({
        collection: 'pages',
        where: { tenant: { equals: tenant.id } },
        sort: '-updatedAt',
        limit: 100,
        user,
        overrideAccess: false,
    });

    const rows: PageRow[] = docs.map((p) => ({
        id: String(p.id),
        title: p.title,
        slug: p.slug,
        status: p._status ?? 'draft',
        updatedAt: new Date(p.updatedAt).toLocaleString(),
    }));

    const columns = [
        { key: 'title' as const, label: 'Title' },
        { key: 'slug' as const, label: 'Slug' },
        { key: 'status' as const, label: 'Status' },
        { key: 'updatedAt' as const, label: 'Updated' },
    ];

    // ── Bind bulk actions ─────────────────────────────────────────────────────
    // Delete is admin-only; editors see the publish button but not delete.
    // BulkActions calls the bound function as `deleteAction(ids: string[])`, so
    // `.bind(null, domain)` produces the correct `(ids) => Promise<void>` shape.
    const boundBulkDelete = user.role === 'admin' ? bulkDeletePagesAction.bind(null, domain) : undefined;
    const boundBulkPublish = bulkPublishPagesAction.bind(null, domain);

    return (
        <div className="flex flex-col gap-6 px-6 py-8">
            <header className="flex items-center justify-between">
                <h1 className="font-semibold text-2xl">Pages</h1>
                <Link
                    href={`/${domain}/content/pages/new/` as Route}
                    className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
                >
                    + New page
                </Link>
            </header>

            <CollectionTable
                rows={rows}
                columns={columns}
                getRowHref={(row) => `/${domain}/content/pages/${row.id}/` as Route}
                getRowLabel={(row) => row.title}
                selectable
                bulkActions={<BulkActions deleteAction={boundBulkDelete} publishAction={boundBulkPublish} />}
                emptyMessage="No pages yet. Create your first page."
                ariaLabel="Pages"
            />
        </div>
    );
}
