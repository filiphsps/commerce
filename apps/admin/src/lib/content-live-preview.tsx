import 'server-only';

import type { ReactNode } from 'react';

import { ContentPreviewBridge } from '@/components/cms/content-preview-bridge';
import { buildStorefrontPreviewUrl } from '@/lib/storefront-preview';

/**
 * Builds the live-preview pane for a CMS content document, ready to hand to
 * `<EditorEditPage renderLivePreview={contentLivePreview} />`. Runs after the
 * editor fetches the document, so it can target the doc's own storefront route
 * via its `slug` / `shopifyHandle`. Server-only: it reads the preview secret
 * through `buildStorefrontPreviewUrl`, so the URL is assembled in the RSC and the
 * client `ContentPreviewBridge` only ever sees the opaque string.
 *
 * Returns `null` when the tenant domain is absent (no host to point the preview
 * at) so the editor renders without a preview pane rather than a broken iframe.
 *
 * @param args.collection - The manifest collection slug (selects the storefront route shape).
 * @param args.data - The fetched document data; `slug`/`shopifyHandle` becomes the preview handle.
 * @param args.locale - The active editing locale (storefront path prefix).
 * @param args.domain - The tenant domain segment.
 * @returns The content preview bridge element, or `null` when no domain is available.
 */
export function contentLivePreview({
    collection,
    data,
    locale,
    domain,
}: {
    collection: string;
    data: Record<string, unknown>;
    locale: string;
    domain: string | null;
}): ReactNode {
    if (!domain) return null;

    const previewUrl = buildStorefrontPreviewUrl({
        domain,
        collection,
        locale,
        data: {
            slug: typeof data.slug === 'string' ? data.slug : undefined,
            shopifyHandle: typeof data.shopifyHandle === 'string' ? data.shopifyHandle : undefined,
        },
    });

    return <ContentPreviewBridge previewUrl={previewUrl} domain={domain} />;
}
