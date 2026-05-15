import 'server-only';

import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createUserAction } from '@/lib/cms-actions/users';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';
import { NewUserForm } from './new-user-form';

export const metadata: Metadata = { title: 'New User' };

type Params = Promise<{ domain: string }>;

export default async function NewUserPage({ params }: { params: Params }) {
    const { domain } = await params;

    // Fetch tenant options server-side so the client form can render the
    // multi-select without a client-side fetch.
    const { payload, user } = await getAuthedPayloadCtx(domain);

    // Defense-in-depth: direct URL access by editors returns 404.
    if (user.role !== 'admin') {
        notFound();
    }

    const { docs: tenantDocs } = await payload.find({
        collection: 'tenants',
        sort: 'name',
        limit: 100,
        user,
        overrideAccess: false,
    });

    const tenantOptions = tenantDocs.map((t) => ({
        id: String(t.id),
        name: String(t.name ?? t.id),
    }));

    // Bind domain into the server action so the form doesn't need to pass it.
    const boundCreate = createUserAction.bind(null, domain);

    return (
        <div className="flex flex-col gap-6 px-6 py-8">
            <header className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <nav aria-label="Breadcrumb">
                        <ol className="flex items-center gap-1 text-muted-foreground text-sm">
                            <li className="flex items-center gap-1">
                                <Link
                                    href={`/${domain}/settings/users/` as Route}
                                    className="hover:text-foreground hover:underline"
                                >
                                    Users
                                </Link>
                            </li>
                            <li className="flex items-center gap-1">
                                <span aria-hidden="true">/</span>
                                <span className="text-foreground">New</span>
                            </li>
                        </ol>
                    </nav>
                    <h1 className="font-semibold text-2xl leading-tight">New user</h1>
                </div>
                <Link
                    href={`/${domain}/settings/users/` as Route}
                    className="text-muted-foreground text-sm hover:text-foreground hover:underline"
                >
                    ← Back to list
                </Link>
            </header>

            <NewUserForm createAction={boundCreate} tenantOptions={tenantOptions} domain={domain} />
        </div>
    );
}
