/**
 * Collection-metadata fixtures for the seeded demo tenant. CMS overlay
 * on top of Shopify collection handles — adds editorial copy +
 * supporting block stack the storefront PLP shows above the product grid.
 */

import { heading, lexicalDoc, paragraph } from './lexical';

export interface CollectionMetadataFixture {
    shopifyHandle: string;
    descriptionOverride: Record<string, unknown>;
    blocks: Array<Record<string, unknown>>;
    seo: Record<string, unknown>;
}

export const collectionMetadataFixtures: CollectionMetadataFixture[] = [
    {
        shopifyHandle: 'fw25',
        descriptionOverride: lexicalDoc([
            heading('Fall/Winter 2025', 'h1'),
            paragraph(
                'Light at the edge of darkness. A 24-piece collection of heavyweight wool, recycled down, and waxed canvas — built around a single brief: survive a Lofoten winter and still look right at Sunday brunch in Stockholm.',
            ),
        ]),
        blocks: [
            {
                blockType: 'banner',
                heading: 'Shot in the Lofoten archipelago',
                subheading: 'Read the lookbook story for the full set of looks and credits.',
                cta: { kind: 'external', label: 'Read the lookbook', url: '/lookbook-fw25/', openInNewTab: false },
                alignment: 'left',
            },
            {
                blockType: 'media-grid',
                itemType: 'icon',
                columns: 4,
                items: [
                    { caption: 'Recycled down' },
                    { caption: 'Värmland wool' },
                    { caption: 'Made in Portugal' },
                    { caption: 'Repaired for life' },
                ],
            },
        ],
        seo: {
            title: 'Fall/Winter 2025 — Nordcom Demo Shop',
            description:
                '24 pieces in heavyweight wool, recycled down, and waxed canvas. Built for the long Nordic dark.',
            keywords: ['fw25', 'fall winter', 'outerwear'],
        },
    },
    {
        shopifyHandle: 'tailoring',
        descriptionOverride: lexicalDoc([
            heading('Tailoring', 'h2'),
            paragraph(
                'Soft-shoulder, four-season weights, half-canvassed where it matters and full-canvassed where it counts. Cut in Porto.',
            ),
        ]),
        blocks: [
            {
                blockType: 'overview',
                source: 'collection',
                collectionHandle: 'tailoring',
                title: 'Browse the cut',
                limit: 12,
            },
        ],
        seo: {
            title: 'Tailoring — Nordcom Demo Shop',
            description: 'Soft-shoulder suiting in four-season weights. Half- or full-canvassed, cut in Porto.',
            keywords: ['tailoring', 'suit', 'menswear'],
        },
    },
];
