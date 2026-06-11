import 'server-only';

import type { Media } from '@nordcom/commerce-cms/types';
import type { Metadata, Route } from 'next';
import { notFound } from 'next/navigation';
import { ContentScrollRegion } from '@/components/shell/content-scroll-region';
import { PageHeader } from '@/components/shell/page-header';
import { getMediaById } from '@/lib/editor-convex-bridge';
import { getAuthedCmsCtx } from '@/lib/cms-ctx';

export const metadata: Metadata = { title: 'Media' };

type Props = {
    params: Promise<{ domain: string; id: string }>;
};

/** The four frozen derivative sizes, in render order for the variants grid. */
const SIZE_NAMES = ['thumbnail', 'card', 'feature', 'hero'] as const;

/**
 * Formats a byte count for the metadata table, collapsing absent values to a dash.
 *
 * @param bytes - The stored blob size in bytes, or `null` when unrecorded.
 * @returns A human-readable size string.
 */
function formatFilesize(bytes: number | null | undefined): string {
    if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * One label/value row of the media metadata table.
 *
 * @param props - The row's label and rendered value.
 * @returns The table row.
 */
function MetaRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline gap-3 text-sm">
            <dt className="w-32 shrink-0 font-medium text-muted-foreground">{label}</dt>
            <dd className="truncate">{value}</dd>
        </div>
    );
}

/**
 * Read-only media detail page over the Convex `cmsMedia` authority (CUTOVER-06). Media documents
 * are immutable post-upload on the native pipeline — the original blob, its finalize-verified
 * metadata, and the four CMSGATE-02 derivative sizes — so this surface presents rather than edits:
 * re-authoring is a fresh upload, and a `cmsMedia` metadata mutation (alt/caption edits) is future
 * Convex-side work. Replaces the Payload-era `EditorEditPage` mount whose generated save actions
 * would have forked media into `cmsDocuments`, away from the real table.
 *
 * @param props - Route params carrying the tenant domain and the media document id.
 * @returns The rendered detail view.
 * @throws Renders `notFound()` for non-admin operators and missing/foreign/unparseable ids.
 */
export default async function MediaDetailPage({ params }: Props) {
    const { domain, id } = await params;

    const { user } = await getAuthedCmsCtx(domain);
    // Defense-in-depth: the media library is admin-only (mirrors the upload page's gate).
    if (user.role !== 'admin') {
        notFound();
    }

    const media = await getMediaById(id);
    if (!media) {
        notFound();
    }

    const isImage = media.mimeType?.startsWith('image/') ?? false;
    const sizes = (media.sizes ?? {}) as NonNullable<Media['sizes']>;

    return (
        <ContentScrollRegion>
            <PageHeader
                title={media.filename || 'Media'}
                breadcrumbs={[
                    { label: 'Settings', href: `/${domain}/settings/` as Route },
                    { label: 'Media', href: `/${domain}/settings/media/` as Route },
                    { label: media.filename || id },
                ]}
            />

            <div className="flex flex-col gap-8 px-6 py-8">
                {isImage && media.url ? (
                    // biome-ignore lint/performance/noImgElement: the serving URL is a rotating Convex storage URL that cannot be pre-declared in next.config remotePatterns; the upstream derivative pipeline already did the resizing.
                    <img
                        src={media.url}
                        alt={media.alt}
                        className="max-h-96 w-fit rounded-md border-2 border-border border-solid bg-muted object-contain"
                    />
                ) : media.url ? (
                    <a href={media.url} className="text-primary text-sm hover:underline">
                        Open original ({media.mimeType})
                    </a>
                ) : (
                    <p className="text-muted-foreground text-sm italic">The original blob is no longer available.</p>
                )}

                <dl className="flex flex-col gap-2">
                    <MetaRow label="Alt text" value={media.alt || '—'} />
                    <MetaRow label="Caption" value={media.caption ?? '—'} />
                    <MetaRow label="Mime type" value={media.mimeType ?? '—'} />
                    <MetaRow label="File size" value={formatFilesize(media.filesize)} />
                    <MetaRow
                        label="Dimensions"
                        value={media.width && media.height ? `${media.width} × ${media.height}` : '—'}
                    />
                    <MetaRow label="Uploaded" value={new Date(media.createdAt).toLocaleString()} />
                </dl>

                {isImage && (
                    <section className="flex flex-col gap-3">
                        <h2 className="font-semibold text-base">Generated sizes</h2>
                        <ul className="flex flex-col gap-1">
                            {SIZE_NAMES.map((size) => {
                                const variant = sizes[size];
                                return (
                                    <li key={size} className="flex items-baseline gap-3 text-sm">
                                        <span className="w-32 shrink-0 font-medium text-muted-foreground capitalize">
                                            {size}
                                        </span>
                                        {variant?.url ? (
                                            <a href={variant.url} className="text-primary hover:underline">
                                                {variant.width && variant.height
                                                    ? `${variant.width} × ${variant.height}`
                                                    : 'open'}
                                            </a>
                                        ) : (
                                            <span className="text-muted-foreground italic">pending</span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}
            </div>
        </ContentScrollRegion>
    );
}
