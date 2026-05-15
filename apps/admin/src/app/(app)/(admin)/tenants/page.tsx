import 'server-only';

import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { CollectionTable } from '@/components/cms/collection-table';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

export const metadata: Metadata = { title: 'Tenants' };

type TenantRow = {
    id: string;
    name: string;
    slug: string;
    defaultLocale: string;
};

export default async function TenantsListPage() {
    // No domain arg — tenants are cross-tenant (global).
    const { payload, user } = await getAuthedPayloadCtx();

    // Layout gate already rejects non-admins, but re-check here for
    // defense-in-depth (direct RSC payload requests bypass layout).
    if (user.role !== 'admin') {
        return null;
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
                    href={'/tenants/new/' as Route}
                    className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
                >
                    + New tenant
                </Link>
            </header>

            <CollectionTable
                rows={rows}
                columns={columns}
                getRowHref={(row) => `/tenants/${row.id}/` as Route}
                getRowLabel={(row) => row.name}
                emptyMessage="No tenants yet. Create your first tenant."
                ariaLabel="Tenants"
            />
        </div>
    );
}
