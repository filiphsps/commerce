// apps/docs/app/sitemap.ts
import type { MetadataRoute } from 'next';
import { docsEnv } from '@/lib/env';
import { pageMap } from '@/lib/page-map.generated';

// Required for `output: 'export'`. The sitemap is a dynamic route — opt it
// into static emission so it ends up in `out/sitemap.xml`.
export const dynamic = 'force-static';

/**
 * Hand-written top-level guide pages under `apps/docs/app/docs/`. Keep in sync
 * with `apps/docs/app/docs/_meta.json` (minus the `(generated)` menu entry,
 * which is covered by the page-map iteration below).
 */
const ROOT_DOC_PAGES = [
    'getting-started',
    'architecture',
    'contributing',
    'deployment',
    'conventions',
    'typescript-project-structure',
];

export default function sitemap(): MetadataRoute.Sitemap {
    const { canonicalUrl } = docsEnv;
    const urls: MetadataRoute.Sitemap = [
        { url: `${canonicalUrl}/`, lastModified: new Date() },
        { url: `${canonicalUrl}/docs/`, lastModified: new Date() },
    ];

    for (const page of ROOT_DOC_PAGES) {
        urls.push({ url: `${canonicalUrl}/docs/${page}/`, lastModified: new Date() });
    }

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
