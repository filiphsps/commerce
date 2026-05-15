import 'server-only';

import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { BulkActions } from '@/components/cms/bulk-actions';
import { CollectionTable } from '@/components/cms/collection-table';
import { bulkDeleteArticlesAction, bulkPublishArticlesAction } from '@/lib/cms-actions/articles';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

export const metadata: Metadata = { title: 'Articles' };

type Params = Promise<{ domain: string }>;

type ArticleRow = {
    id: string;
    title: string;
    slug: string;
    status: string;
    publishedAt: string;
};

export default async function ArticlesListPage({ params }: { params: Params }) {
    const { domain } = await params;

    // ── Auth + tenant resolution ──────────────────────────────────────────────
    const { payload, user, tenant } = await getAuthedPayloadCtx(domain);

    if (!tenant) {
        return null;
    }

    // ── Fetch articles scoped to this tenant ──────────────────────────────────
    const { docs } = await payload.find({
        collection: 'articles',
        where: { tenant: { equals: tenant.id } },
        sort: '-updatedAt',
        limit: 100,
        user,
        overrideAccess: false,
    });

    const rows: ArticleRow[] = docs.map((a) => ({
        id: String(a.id),
        title: a.title,
        slug: a.slug,
        status: a._status ?? 'draft',
        publishedAt: a.publishedAt ? new Date(a.publishedAt).toLocaleString() : 'Not published',
    }));

    const columns = [
        { key: 'title' as const, label: 'Title' },
        { key: 'slug' as const, label: 'Slug' },
        { key: 'status' as const, label: 'Status' },
        { key: 'publishedAt' as const, label: 'Published' },
    ];

    // ── Bind bulk actions ─────────────────────────────────────────────────────
    // Delete is admin-only; editors see the publish button but not delete.
    // BulkActions calls the bound function as `deleteAction(ids: string[])`, so
    // `.bind(null, domain)` produces the correct `(ids) => Promise<void>` shape.
    const boundBulkDelete = user.role === 'admin' ? bulkDeleteArticlesAction.bind(null, domain) : undefined;
    const boundBulkPublish = bulkPublishArticlesAction.bind(null, domain);

    return (
        <div className="flex flex-col gap-6 px-6 py-8">
            <header className="flex items-center justify-between">
                <h1 className="font-semibold text-2xl">Articles</h1>
                <Link
                    href={`/${domain}/content/articles/new/` as Route}
                    className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
                >
                    + New article
                </Link>
            </header>

            <CollectionTable
                rows={rows}
                columns={columns}
                getRowHref={(row) => `/${domain}/content/articles/${row.id}/` as Route}
                getRowLabel={(row) => row.title}
                selectable
                bulkActions={<BulkActions deleteAction={boundBulkDelete} publishAction={boundBulkPublish} />}
                emptyMessage="No articles yet. Create your first article."
                ariaLabel="Articles"
            />
        </div>
    );
}
