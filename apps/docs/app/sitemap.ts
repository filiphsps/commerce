// apps/docs/app/sitemap.ts
import type { MetadataRoute } from 'next';
import { docsEnv } from '@/lib/env';
import { pageMap } from '@/lib/page-map.generated';

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
