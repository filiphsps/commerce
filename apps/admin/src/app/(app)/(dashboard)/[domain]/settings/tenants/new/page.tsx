import 'server-only';

import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createTenantAction } from '@/lib/cms-actions/tenants';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';
import { NewTenantForm } from './new-tenant-form';

export const metadata: Metadata = { title: 'New Tenant' };

type Params = Promise<{ domain: string }>;

export default async function NewTenantPage({ params }: { params: Params }) {
    const { domain } = await params;

    const { user } = await getAuthedPayloadCtx(domain);

    // Defense-in-depth: direct URL access by editors returns 404.
    if (user.role !== 'admin') {
        notFound();
    }

    // Bind domain into the server action so the form doesn't need to pass it.
    const boundCreate = createTenantAction.bind(null, domain);

    return (
        <div className="flex flex-col gap-6 px-6 py-8">
            <header className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <nav aria-label="Breadcrumb">
                        <ol className="flex items-center gap-1 text-muted-foreground text-sm">
                            <li className="flex items-center gap-1">
                                <Link
                                    href={`/${domain}/settings/tenants/` as Route}
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
                    href={`/${domain}/settings/tenants/` as Route}
                    className="text-muted-foreground text-sm hover:text-foreground hover:underline"
                >
                    ← Back to list
                </Link>
            </header>

            <NewTenantForm createAction={boundCreate} domain={domain} />
        </div>
    );
}
