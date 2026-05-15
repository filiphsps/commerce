import 'server-only';

import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createArticleAction } from '@/lib/cms-actions/articles';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';
import { NewArticleForm } from './new-article-form';

export const metadata: Metadata = { title: 'New Article' };

type Params = Promise<{ domain: string }>;

export default async function NewArticlePage({ params }: { params: Params }) {
    const { domain } = await params;

    // ── Auth + tenant resolution ──────────────────────────────────────────────
    const { tenant } = await getAuthedPayloadCtx(domain);

    if (!tenant) {
        notFound();
    }

    // ── Bind domain into createArticleAction ──────────────────────────────────
    // `.bind(null, domain)` produces `(formData: FormData) => Promise<{ id: string }>`.
    // The NewArticleForm builds the _payload blob manually since there's no
    // existing doc to anchor an autosave cycle.
    const boundCreate = createArticleAction.bind(null, domain);

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
                                    href={`/${domain}/content/articles/` as Route}
                                    className="hover:text-foreground hover:underline"
                                >
                                    Articles
                                </Link>
                            </li>
                            <li className="flex items-center gap-1">
                                <span aria-hidden="true">/</span>
                                <span className="text-foreground">New</span>
                            </li>
                        </ol>
                    </nav>
                    <h1 className="font-semibold text-2xl leading-tight">New article</h1>
                </div>
                <Link
                    href={`/${domain}/content/articles/` as Route}
                    className="text-muted-foreground text-sm hover:text-foreground hover:underline"
                >
                    ← Back to list
                </Link>
            </header>

            <NewArticleForm createAction={boundCreate} domain={domain} />
        </div>
    );
}
