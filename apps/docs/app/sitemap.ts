import type { MetadataRoute } from 'next';
import { docsEnv } from '@/lib/env';
import { source } from '@/lib/source';

// Required for `output: 'export'`. The sitemap is a dynamic route — opt it
// into static emission so it ends up in `out/sitemap.xml`.
export const dynamic = 'force-static';

/**
 * Generates the XML sitemap from the Fumadocs source. Covers every page in
 * the four content tabs so search engines see the full URL set.
 *
 * @returns Array of URL entries for Next.js sitemap generation.
 */
export default function sitemap(): MetadataRoute.Sitemap {
    const { canonicalUrl } = docsEnv;
    const pages = source.generateParams();
    return pages.map(({ slug }) => ({
        url: `${canonicalUrl}/${(slug ?? []).join('/')}/`,
        lastModified: new Date(),
    }));
}
