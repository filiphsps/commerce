import 'server-only';

import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createPageAction } from '@/lib/cms-actions/pages';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';
import { NewPageForm } from './new-page-form';

export const metadata: Metadata = { title: 'New Page' };

type Params = Promise<{ domain: string }>;

export default async function NewPagePage({ params }: { params: Params }) {
    const { domain } = await params;

    // ── Auth + tenant resolution ──────────────────────────────────────────────
    const { tenant } = await getAuthedPayloadCtx(domain);

    if (!tenant) {
        notFound();
    }

    // ── Bind domain into createPageAction ─────────────────────────────────────
    // `.bind(null, domain)` produces `(formData: FormData) => Promise<{ id: string }>`.
    // The NewPageForm builds the _payload blob manually since there's no
    // existing doc to anchor an autosave cycle.
    const boundCreate = createPageAction.bind(null, domain);

    return (
        <div className="flex flex-col gap-6 px-6 py-8">
            <header className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <nav aria-label="Breadcrumb">
                        <ol className="flex items-center gap-1 text-muted-foreground text-sm">
                            <li className="flex items-center gap-1">
                                <Link
                                    href={`/${domain}/content/` as Route}
                                    className="hover:text-foreground hover:underline"
                                >
                                    Content
                                </Link>
                            </li>
                            <li className="flex items-center gap-1">
                                <span aria-hidden="true">/</span>
                                <Link
                                    href={`/${domain}/content/pages/` as Route}
                                    className="hover:text-foreground hover:underline"
                                >
                                    Pages
                                </Link>
                            </li>
                            <li className="flex items-center gap-1">
                                <span aria-hidden="true">/</span>
                                <span className="text-foreground">New</span>
                            </li>
                        </ol>
                    </nav>
                    <h1 className="font-semibold text-2xl leading-tight">New page</h1>
                </div>
                <Link
                    href={`/${domain}/content/pages/` as Route}
                    className="text-muted-foreground text-sm hover:text-foreground hover:underline"
                >
                    ← Back to list
                </Link>
            </header>

            <NewPageForm createAction={boundCreate} domain={domain} />
        </div>
    );
}
