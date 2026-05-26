/**
 * Collection-metadata fixtures for the seeded demo tenant. CMS overlay
 * on top of Shopify collection handles — adds editorial copy +
 * supporting block stack the storefront PLP shows above the product grid.
 *
 * Handles point at the live mock.shop catalogue (`featured`, `men`, etc.)
 * so collection blocks actually resolve.
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
        shopifyHandle: 'featured',
        descriptionOverride: lexicalDoc([
            heading('Featured', 'h1'),
            paragraph(
                'The pieces our team is wearing right now — hand-picked across the catalogue, refreshed every Monday morning.',
            ),
        ]),
        blocks: [
            {
                blockType: 'banner',
                heading: 'This week in the studio',
                subheading: 'A rotating capsule the design team curates from current production.',
                cta: { kind: 'external', label: 'Read the journal', url: '/journal/', openInNewTab: false },
                alignment: 'left',
            },
            {
                blockType: 'media-grid',
                itemType: 'icon',
                columns: 4,
                items: [
                    { caption: 'Recycled materials' },
                    { caption: 'Made in Portugal' },
                    { caption: 'Free 30-day returns' },
                    { caption: 'Repaired for life' },
                ],
            },
        ],
        seo: {
            title: 'Featured — Nordcom Demo Shop',
            description: 'Hand-picked pieces from the studio, refreshed every Monday morning.',
            keywords: ['featured', 'curated', 'editorial'],
        },
    },
    {
        shopifyHandle: 'men',
        descriptionOverride: lexicalDoc([
            heading('Menswear', 'h2'),
            paragraph(
                'Soft-shoulder shirting, mid-weight knits, and the kind of trousers you reach for first. Cut in Porto, finished by hand.',
            ),
        ]),
        blocks: [
            {
                blockType: 'overview',
                source: 'collection',
                collectionHandle: 'men',
                title: 'Browse the range',
                limit: 12,
            },
        ],
        seo: {
            title: 'Menswear — Nordcom Demo Shop',
            description: 'Soft-shoulder shirting, mid-weight knits, and considered trousers. Cut in Porto.',
            keywords: ['menswear', 'tailoring'],
        },
    },
    {
        shopifyHandle: 'women',
        descriptionOverride: lexicalDoc([
            heading('Womenswear', 'h2'),
            paragraph(
                'Considered staples and statement pieces, made to be worn together. Outerwear, knits, and dresses cut in mid-weight wool and organic cotton.',
            ),
        ]),
        blocks: [
            {
                blockType: 'overview',
                source: 'collection',
                collectionHandle: 'women',
                title: 'Browse the range',
                limit: 12,
            },
        ],
        seo: {
            title: 'Womenswear — Nordcom Demo Shop',
            description: 'Considered staples and statement pieces. Mid-weight wool, organic cotton, made to last.',
            keywords: ['womenswear'],
        },
    },
];
