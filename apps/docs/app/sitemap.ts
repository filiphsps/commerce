import type { MetadataRoute } from 'next';
import { docsEnv } from '@/lib/env';
import { source } from '@/lib/source';

// Required for `output: 'export'`. The sitemap is a dynamic route — opt it
// into static emission so it ends up in `out/sitemap.xml`.
export const dynamic = 'force-static';

/**
 * Static sitemap built from every Fumadocs source page. Honours the runtime
 * `NEXT_PUBLIC_DOCS_BASE_PATH` and `NEXT_PUBLIC_DOCS_CANONICAL_URL` so
 * deployments at any sub-path produce correct absolute URLs. Covers all four
 * content tabs: docs, packages, reference, and errors.
 *
 * @returns Array of URL entries for Next.js sitemap generation.
 */
export default function sitemap(): MetadataRoute.Sitemap {
    return source.getPages().map((page) => ({
        url: `${docsEnv.canonicalUrl}${page.url}`,
        lastModified: new Date(),
    }));
}
