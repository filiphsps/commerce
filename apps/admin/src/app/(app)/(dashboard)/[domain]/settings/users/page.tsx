import 'server-only';

import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CollectionTable } from '@/components/cms/collection-table';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

export const metadata: Metadata = { title: 'Users' };

type UserRow = {
    id: string;
    email: string;
    role: string;
    tenantCount: string;
};

type Params = Promise<{ domain: string }>;

export default async function UsersListPage({ params }: { params: Params }) {
    const { domain } = await params;

    // Users are cross-tenant (global). We pass domain only to resolve the
    // current user — the collection itself is not tenant-scoped.
    const { payload, user } = await getAuthedPayloadCtx(domain);

    // Defense-in-depth: direct URL access by editors returns 404.
    if (user.role !== 'admin') {
        notFound();
    }

    // Fetch all users — no tenant scoping filter; users are cross-tenant.
    // Limit 200 is generous for typical deployments.
    const { docs } = await payload.find({
        collection: 'users',
        sort: 'email',
        limit: 200,
        user,
        overrideAccess: false,
    });

    const rows: UserRow[] = docs.map((u) => {
        const tenants = Array.isArray(u.tenants) ? u.tenants : [];
        return {
            id: String(u.id),
            email: String(u.email ?? ''),
            role: String(u.role ?? ''),
            tenantCount: String(tenants.length),
        };
    });

    const columns = [
        { key: 'email' as const, label: 'Email' },
        { key: 'role' as const, label: 'Role' },
        { key: 'tenantCount' as const, label: 'Tenants' },
    ];

    return (
        <div className="flex flex-col gap-6 px-6 py-8">
            <header className="flex items-center justify-between">
                <h1 className="font-semibold text-2xl">Users</h1>
                <Link
                    href={`/${domain}/settings/users/new/` as Route}
                    className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
                >
                    + New user
                </Link>
            </header>

            <CollectionTable
                rows={rows}
                columns={columns}
                getRowHref={(row) => `/${domain}/settings/users/${row.id}/` as Route}
                getRowLabel={(row) => row.email}
                emptyMessage="No users yet. Create your first user."
                ariaLabel="Users"
            />
        </div>
    );
}
