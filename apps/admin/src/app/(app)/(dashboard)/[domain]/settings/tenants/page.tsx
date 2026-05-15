import 'server-only';

import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CollectionTable } from '@/components/cms/collection-table';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

export const metadata: Metadata = { title: 'Tenants' };

type TenantRow = {
    id: string;
    name: string;
    slug: string;
    defaultLocale: string;
};

type Params = Promise<{ domain: string }>;

export default async function TenantsListPage({ params }: { params: Params }) {
    const { domain } = await params;

    // Tenants are cross-tenant (global). We pass domain only to resolve the
    // current user — the collection itself is not tenant-scoped.
    const { payload, user } = await getAuthedPayloadCtx(domain);

    // Defense-in-depth: direct URL access by editors returns 404.
    if (user.role !== 'admin') {
        notFound();
    }

    // Fetch all tenants — no tenant scoping filter; the collection IS the
    // top-level entity. Limit 100 is generous; most deployments have <10.
    const { docs } = await payload.find({
        collection: 'tenants',
        sort: 'name',
        limit: 100,
        user,
        overrideAccess: false,
    });

    const rows: TenantRow[] = docs.map((t) => ({
        id: String(t.id),
        name: String(t.name ?? ''),
        slug: String(t.slug ?? ''),
        defaultLocale: String(t.defaultLocale ?? ''),
    }));

    const columns = [
        { key: 'name' as const, label: 'Name' },
        { key: 'slug' as const, label: 'Slug' },
        { key: 'defaultLocale' as const, label: 'Default Locale' },
    ];

    return (
        <div className="flex flex-col gap-6 px-6 py-8">
            <header className="flex items-center justify-between">
                <h1 className="font-semibold text-2xl">Tenants</h1>
                <Link
                    href={`/${domain}/settings/tenants/new/` as Route}
                    className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
                >
                    + New tenant
                </Link>
            </header>

            <CollectionTable
                rows={rows}
                columns={columns}
                getRowHref={(row) => `/${domain}/settings/tenants/${row.id}/` as Route}
                getRowLabel={(row) => row.name}
                emptyMessage="No tenants yet. Create your first tenant."
                ariaLabel="Tenants"
            />
        </div>
    );
}
