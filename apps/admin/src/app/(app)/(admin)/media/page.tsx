import 'server-only';

import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

export const metadata: Metadata = { title: 'Media Library' };

/** Derive the URL to display for a media doc — prioritise the thumbnail size for images. */
function getThumbnailSrc(doc: {
    mimeType?: string | null;
    url?: string | null;
    sizes?: { thumbnail?: { url?: string | null } };
}): string | null {
    if (!doc.mimeType?.startsWith('image/')) return null;
    return doc.sizes?.thumbnail?.url ?? doc.url ?? null;
}

/** Short human-readable label for non-image MIME types shown as a placeholder tile. */
function mimeLabel(mimeType: string): string {
    if (mimeType === 'video/mp4') return 'MP4';
    if (mimeType === 'application/pdf') return 'PDF';
    // Fallback: take the subtype part of the MIME string
    const sub = mimeType.split('/')[1];
    return sub ? sub.toUpperCase().slice(0, 6) : 'FILE';
}

export default async function MediaListPage() {
    const { payload, user } = await getAuthedPayloadCtx();

    const { docs } = await payload.find({
        collection: 'media',
        sort: '-updatedAt',
        limit: 200,
        user,
        overrideAccess: false,
    });

    return (
        <div className="flex flex-col gap-6 px-6 py-8">
            <header className="flex items-center justify-between">
                <h1 className="font-semibold text-2xl">Media library</h1>
                <Link
                    href={'/media/upload/' as Route}
                    className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
                >
                    + Upload
                </Link>
            </header>

            {docs.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    No media yet.{' '}
                    <Link href={'/media/upload/' as Route} className="underline hover:text-foreground">
                        Upload your first file
                    </Link>
                    .
                </p>
            ) : (
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {docs.map((m) => {
                        const thumbnailSrc = getThumbnailSrc(m);
                        const label = String(m.filename ?? m.alt ?? String(m.id));

                        return (
                            <li key={String(m.id)}>
                                <Link
                                    href={`/media/${m.id}/` as Route}
                                    className="block overflow-hidden rounded border border-border hover:border-ring"
                                >
                                    <div className="aspect-square overflow-hidden bg-muted">
                                        {thumbnailSrc ? (
                                            // Use plain <img> — locally-stored media URLs are served from the
                                            // same admin origin (localhost in dev, admin domain in prod).
                                            // The `next.config.js` remotePatterns only allowlist external CDNs
                                            // (Shopify, Unsplash, etc.), so next/image would reject same-origin
                                            // upload URLs with an InvalidUrl error.
                                            // biome-ignore lint/performance/noImgElement: same-origin upload URL, not in remotePatterns
                                            <img
                                                src={thumbnailSrc}
                                                alt={String(m.alt ?? '')}
                                                className="h-full w-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <span className="font-mono font-semibold text-muted-foreground text-xs">
                                                    {mimeLabel(String(m.mimeType ?? 'FILE'))}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </Link>
                                <p className="mt-1 truncate text-muted-foreground text-xs" title={label}>
                                    {label}
                                </p>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
