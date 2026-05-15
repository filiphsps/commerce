import 'server-only';

import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { deleteMediaAction, updateMediaAction } from '@/lib/cms-actions/media';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';
import { MediaForm } from './media-form';

export const metadata: Metadata = { title: 'Edit Media' };

export type EditMediaPageProps = {
    params: Promise<{ domain: string; id: string }>;
};

/** Derive a display URL for the preview — prefer the `card` size for a larger preview. */
function getPreviewSrc(doc: {
    mimeType?: string | null;
    url?: string | null;
    sizes?: { card?: { url?: string | null }; thumbnail?: { url?: string | null } };
}): string | null {
    if (!doc.mimeType?.startsWith('image/')) return null;
    return doc.sizes?.card?.url ?? doc.sizes?.thumbnail?.url ?? doc.url ?? null;
}

export default async function EditMediaPage({ params }: EditMediaPageProps) {
    const { domain, id } = await params;

    const { payload, user } = await getAuthedPayloadCtx(domain);

    // Defense-in-depth: direct URL access by editors returns 404.
    if (user.role !== 'admin') {
        notFound();
    }

    const media = await payload.findByID({
        collection: 'media',
        id,
        user,
        overrideAccess: false,
    });

    if (!media) {
        notFound();
    }

    // Bind domain + id into server actions — `<form action={bound}>` passes FormData as
    // the first arg after binding, so calling signatures match.
    const boundUpdate = updateMediaAction.bind(null, domain, id);
    const boundDelete = deleteMediaAction.bind(null, domain, id);

    const title = String(media.filename ?? media.alt ?? `Media ${id}`);
    const previewSrc = getPreviewSrc(media);

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
                                <span className="max-w-[200px] truncate text-foreground" title={title}>
                                    {title}
                                </span>
                            </li>
                        </ol>
                    </nav>
                    <h1 className="font-semibold text-2xl leading-tight">{title}</h1>
                </div>
                <Link
                    href={`/${domain}/settings/media/` as Route}
                    className="text-muted-foreground text-sm hover:text-foreground hover:underline"
                >
                    ← Back to library
                </Link>
            </header>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Preview panel */}
                <div className="flex flex-col gap-3">
                    <div className="overflow-hidden rounded-lg border border-border bg-muted">
                        {previewSrc ? (
                            // Plain <img> — locally-stored media URLs are same-origin and not in
                            // the next.config.js remotePatterns allowlist, so next/image rejects them.
                            // biome-ignore lint/performance/noImgElement: same-origin upload URL, not in remotePatterns
                            <img
                                src={previewSrc}
                                alt={String(media.alt ?? '')}
                                className="h-auto w-full object-contain"
                            />
                        ) : (
                            <div className="flex h-48 items-center justify-center">
                                <span className="font-mono font-semibold text-lg text-muted-foreground">
                                    {String(media.mimeType ?? 'FILE').toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* File metadata */}
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        {media.filename ? (
                            <>
                                <dt className="text-muted-foreground">Filename</dt>
                                <dd className="truncate font-mono text-xs">{media.filename}</dd>
                            </>
                        ) : null}
                        {media.mimeType ? (
                            <>
                                <dt className="text-muted-foreground">Type</dt>
                                <dd>{media.mimeType}</dd>
                            </>
                        ) : null}
                        {media.filesize ? (
                            <>
                                <dt className="text-muted-foreground">Size</dt>
                                <dd>{(media.filesize / 1024).toFixed(1)} KB</dd>
                            </>
                        ) : null}
                        {media.width && media.height ? (
                            <>
                                <dt className="text-muted-foreground">Dimensions</dt>
                                <dd>
                                    {media.width}&times;{media.height}
                                </dd>
                            </>
                        ) : null}
                        {media.url ? (
                            <>
                                <dt className="text-muted-foreground">URL</dt>
                                <dd className="truncate">
                                    <a
                                        href={media.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline hover:text-foreground"
                                    >
                                        {media.url}
                                    </a>
                                </dd>
                            </>
                        ) : null}
                    </dl>
                </div>

                {/* Edit form */}
                <MediaForm
                    mediaId={id}
                    initialAlt={media.alt}
                    initialCaption={media.caption ?? ''}
                    updateAction={boundUpdate}
                    deleteAction={boundDelete}
                />
            </div>
        </div>
    );
}
