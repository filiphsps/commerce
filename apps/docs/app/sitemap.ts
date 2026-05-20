// apps/docs/app/sitemap.ts
import type { MetadataRoute } from 'next';
import { docsEnv } from '@/lib/env';
import { pageMap } from '@/lib/page-map.generated';

// Required for `output: 'export'`. The sitemap is a dynamic route — opt it
// into static emission so it ends up in `out/sitemap.xml`.
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
    const { canonicalUrl } = docsEnv;
    const urls: MetadataRoute.Sitemap = [
        { url: `${canonicalUrl}/`, lastModified: new Date() },
        { url: `${canonicalUrl}/docs/`, lastModified: new Date() },
    ];

    for (const ws of pageMap) {
        for (const p of ws.pages) {
            urls.push({
                url: `${canonicalUrl}/docs/${ws.slug}/${p === 'index' ? '' : `${p}/`}`,
                lastModified: new Date(),
            });
        }
    }

    return urls;
}
