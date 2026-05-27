import type { AdvancedIndex } from 'fumadocs-core/search/server';
import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '@/lib/source';

/**
 * Statically-cached Orama search route. `staticGET` writes a single JSON file
 * at build time; the client-side `useDocsSearch` hook downloads it on first use.
 * Required to be `revalidate = false` for `output: 'export'` builds.
 *
 * Reference pages are indexed by title + description only (not full body) per
 * spec §Q11 — their generated content is voluminous and low-signal for search.
 * Other tabs index their full structured-data body.
 */
export const revalidate = false;
export const dynamic = 'force-static';

export const { staticGET: GET } = createFromSource(source, {
    buildIndex: (page): AdvancedIndex => {
        const isReference = page.url.includes('/reference/');
        if (isReference) {
            return {
                id: page.url,
                title: page.data.title ?? '',
                description: page.data.description,
                url: page.url,
                structuredData: {
                    headings: [],
                    contents: page.data.description ? [{ heading: undefined, content: page.data.description }] : [],
                },
            };
        }
        return {
            id: page.url,
            title: page.data.title ?? '',
            description: page.data.description,
            url: page.url,
            structuredData: page.data.structuredData,
        };
    },
});
