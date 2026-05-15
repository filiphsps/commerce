import 'server-only';

import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { createTenantAction } from '@/lib/cms-actions/tenants';
import { NewTenantForm } from './new-tenant-form';

export const metadata: Metadata = { title: 'New Tenant' };

export default async function NewTenantPage() {
    // Layout gate already enforces admin role. Bind createTenantAction so the
    // client form receives the callable without needing to import 'use server'.
    const boundCreate = createTenantAction;

    return (
        <div className="flex flex-col gap-6 px-6 py-8">
            <header className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <nav aria-label="Breadcrumb">
                        <ol className="flex items-center gap-1 text-muted-foreground text-sm">
                            <li className="flex items-center gap-1">
                                <Link
                                    href={'/tenants/' as Route}
                                    className="hover:text-foreground hover:underline"
                                >
                                    Tenants
                                </Link>
                            </li>
                            <li className="flex items-center gap-1">
                                <span aria-hidden="true">/</span>
                                <span className="text-foreground">New</span>
                            </li>
                        </ol>
                    </nav>
                    <h1 className="font-semibold text-2xl leading-tight">New tenant</h1>
                </div>
                <Link
                    href={'/tenants/' as Route}
                    className="text-muted-foreground text-sm hover:text-foreground hover:underline"
                >
                    ← Back to list
                </Link>
            </header>

            <NewTenantForm createAction={boundCreate} />
        </div>
    );
}
