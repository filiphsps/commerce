import 'server-only';

import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { UploadForm } from './upload-form';

export const metadata: Metadata = { title: 'Upload Media' };

export default function UploadMediaPage() {
    return (
        <div className="flex flex-col gap-6 px-6 py-8">
            <header className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <nav aria-label="Breadcrumb">
                        <ol className="flex items-center gap-1 text-muted-foreground text-sm">
                            <li className="flex items-center gap-1">
                                <Link
                                    href={'/media/' as Route}
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
                    href={'/media/' as Route}
                    className="text-muted-foreground text-sm hover:text-foreground hover:underline"
                >
                    ← Back to library
                </Link>
            </header>

            <UploadForm />
        </div>
    );
}
