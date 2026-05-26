import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { Media } from '../../types/payload-types';
import { adminOnly } from '../access';
import { defineCollectionEditor } from '../manifest';

/**
 * Resolve the smallest URL Payload can offer for an upload. Prefers the
 * `thumbnail` imageSize variant, then Payload's auto `thumbnailURL`, then
 * the original `url`. Returns null when nothing renderable exists yet
 * (e.g. a fresh doc before the upload finishes).
 *
 * @param doc - Partial media document returned by `payload.find`.
 * @returns Smallest available URL, or null when the upload has no URLs.
 */
function pickThumbUrl(doc: Partial<Media>): string | null {
    return doc.sizes?.thumbnail?.url ?? doc.thumbnailURL ?? doc.url ?? null;
}

/**
 * Inline preview cell for the media list. Images render as a square
 * thumbnail; non-image uploads (video, pdf, other) render a short type
 * badge so the row stays scannable without forcing a click-through.
 *
 * @param doc - Partial media document for the current row.
 * @returns React node rendered into the table cell.
 */
function renderPreview(doc: Partial<Media>): ReactNode {
    const mime = doc.mimeType ?? '';
    const alt = doc.alt || doc.filename || 'Media preview';

    if (mime.startsWith('image/')) {
        const url = pickThumbUrl(doc);
        if (url) {
            return (
                // biome-ignore lint/performance/noImgElement: list-cell thumbnails hit arbitrary S3-hosted URLs that the cms package can't pre-declare in `next.config` remotePatterns; the upstream `card`/`thumbnail` image-size variants already do the heavy resizing on upload.
                <img
                    src={url}
                    alt={alt}
                    loading="lazy"
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-md border-2 border-border border-solid bg-muted object-cover"
                />
            );
        }
    }

    const badge = mime.startsWith('video/')
        ? 'VIDEO'
        : mime === 'application/pdf'
          ? 'PDF'
          : (mime.split('/')[1]?.toUpperCase() ?? 'FILE');

    return (
        <div
            aria-label={`${badge} preview`}
            className="flex h-12 w-12 items-center justify-center rounded-md border-2 border-border border-solid bg-muted font-semibold text-[10px] text-muted-foreground uppercase tracking-wide"
        >
            {badge}
        </div>
    );
}

export const mediaEditor = defineCollectionEditor({
    collection: 'media',
    routes: {
        label: { singular: 'Media', plural: 'Media' },
        basePath: (domain) => `/${domain}/settings/media/` as Route,
        breadcrumbs: ({ domain }) => [{ label: 'Settings', href: `/${domain}/settings/` as Route }, { label: 'Media' }],
    },
    tenant: { kind: 'shared', readableBy: 'admin' },
    access: {
        list: adminOnly,
        read: adminOnly,
        create: adminOnly,
        update: adminOnly,
        delete: adminOnly,
    },
    list: {
        columns: [
            {
                label: 'Preview',
                accessor: (doc) => (doc as Partial<Media>).filename ?? null,
                render: (_value, doc) => renderPreview(doc as Partial<Media>),
            },
            { label: 'Filename', accessor: 'filename' },
            { label: 'Mime type', accessor: 'mimeType' },
            { label: 'Updated', accessor: 'updatedAt' },
        ],
    },
});
