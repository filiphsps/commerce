import 'server-only';

import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';
import { UploadForm } from './upload-form';

export const metadata: Metadata = { title: 'Upload Media' };

type Params = Promise<{ domain: string }>;

export default async function UploadMediaPage({ params }: { params: Params }) {
    const { domain } = await params;

    const { user } = await getAuthedPayloadCtx(domain);

    // Defense-in-depth: direct URL access by editors returns 404.
    if (user.role !== 'admin') {
        notFound();
    }

    return (
        <div className="flex flex-col gap-6 px-6 py-8">
            <header className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <nav aria-label="Breadcrumb">
                        <ol className="flex items-center gap-1 text-muted-foreground text-sm">
                            <li className="flex items-center gap-1">
                                <Link
                                    href={`/${domain}/settings/media/` as Route}
                                    className="hover:text-foreground hover:underline"
                                >
                                    Media
                                </Link>
                            </li>
                            <li className="flex items-center gap-1">
                                <span aria-hidden="true">/</span>
                                <span className="text-foreground">Upload</span>
                            </li>
                        </ol>
                    </nav>
                    <h1 className="font-semibold text-2xl leading-tight">Upload media</h1>
                </div>
                <Link
                    href={`/${domain}/settings/media/` as Route}
                    className="text-muted-foreground text-sm hover:text-foreground hover:underline"
                >
                    ← Back to library
                </Link>
            </header>

            <UploadForm domain={domain} />
        </div>
    );
}
