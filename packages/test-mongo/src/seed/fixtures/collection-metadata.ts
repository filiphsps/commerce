/**
 * Collection-metadata fixtures for the seeded demo tenant. CMS overlay
 * on top of Shopify collection handles — adds editorial copy +
 * supporting block stack the storefront PLP shows above the product grid.
 *
 * Covers every collection mock.shop exposes: `men`, `women`, `unisex`,
 * `tops`, `bottoms`, `accessories`, `featured`, `shoes`.
 */

import { heading, lexicalDoc, list, paragraph } from './lexical';

export interface CollectionMetadataFixture {
    shopifyHandle: string;
    descriptionOverride: Record<string, unknown>;
    blocks: Array<Record<string, unknown>>;
    seo: Record<string, unknown>;
}

const externalLink = (label: string, url: string): Record<string, unknown> => ({
    kind: 'external',
    label,
    url,
    openInNewTab: false,
});

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
                cta: externalLink('Read the journal', '/journal/'),
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
            {
                blockType: 'alert',
                severity: 'info',
                title: 'Free 30-day returns',
                body: 'Try anything at home. Send it back at no cost if it is not right.',
                dismissible: false,
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
    {
        shopifyHandle: 'unisex',
        descriptionOverride: lexicalDoc([
            heading('Unisex', 'h2'),
            paragraph('Pieces built without a gender brief — relaxed through the shoulder, cut to fit anyone.'),
        ]),
        blocks: [
            {
                blockType: 'overview',
                source: 'collection',
                collectionHandle: 'unisex',
                title: 'Shop unisex',
                limit: 12,
            },
        ],
        seo: {
            title: 'Unisex — Nordcom Demo Shop',
            description: 'Relaxed-through-the-shoulder pieces, cut without a gender brief.',
            keywords: ['unisex'],
        },
    },
    {
        shopifyHandle: 'tops',
        descriptionOverride: lexicalDoc([
            heading('Tops', 'h2'),
            paragraph(
                'Hoodies, crewnecks, T-shirts, and the half-zip. All loopback Egyptian cotton, garment-dyed in Porto.',
            ),
        ]),
        blocks: [
            { blockType: 'collection', handle: 'tops', title: 'Shop the range', layout: 'grid', limit: 24 },
            {
                blockType: 'rich-text',
                body: lexicalDoc([
                    heading('Fabric', 'h3'),
                    paragraph(
                        '380 g/m² loopback cotton. 100% long-staple Egyptian fibre, garment-dyed, pre-shrunk in finishing.',
                    ),
                ]),
            },
        ],
        seo: {
            title: 'Tops — Nordcom Demo Shop',
            description: 'Loopback Egyptian cotton in five colours. Garment-dyed, pre-shrunk, made to last.',
            keywords: ['tops', 'hoodies', 'tshirts'],
        },
    },
    {
        shopifyHandle: 'bottoms',
        descriptionOverride: lexicalDoc([
            heading('Bottoms', 'h2'),
            paragraph('Sweatpants, leggings, shorts. Drawstring or elastic, never both.'),
        ]),
        blocks: [
            { blockType: 'collection', handle: 'bottoms', title: 'Shop the range', layout: 'grid', limit: 24 },
            {
                blockType: 'rich-text',
                collapsible: true,
                collapsedByDefault: true,
                collapseLabel: 'Fit & care',
                body: lexicalDoc([
                    list([
                        'Regular through the thigh, tapered below the knee.',
                        'Pre-shrunk loopback or 4-way stretch.',
                        'Cold machine wash, hang to dry.',
                    ]),
                ]),
            },
        ],
        seo: {
            title: 'Bottoms — Nordcom Demo Shop',
            description: 'Sweatpants, leggings, shorts. Drawstring or elastic, never both.',
            keywords: ['bottoms', 'sweatpants', 'shorts'],
        },
    },
    {
        shopifyHandle: 'shoes',
        descriptionOverride: lexicalDoc([
            heading('Shoes', 'h2'),
            paragraph(
                'Canvas, leather, and rubber. Cup-soled sneakers built to be resoled — bring them back, we will send them on to our cobbler in Porto.',
            ),
        ]),
        blocks: [
            { blockType: 'collection', handle: 'shoes', title: 'Shop the range', layout: 'carousel', limit: 12 },
            {
                blockType: 'alert',
                severity: 'success',
                title: 'Free resoles for life',
                body: 'Bring (or post) any pair from the cup-soled range back to us and we will resole them in Porto. Lifetime guarantee.',
                dismissible: true,
            },
        ],
        seo: {
            title: 'Shoes — Nordcom Demo Shop',
            description: 'Canvas, leather, and rubber. Cup-soled, resole-friendly, made to last.',
            keywords: ['shoes', 'sneakers'],
        },
    },
    {
        shopifyHandle: 'accessories',
        descriptionOverride: lexicalDoc([
            heading('Accessories', 'h2'),
            paragraph('The small stuff — beanie, sunnies, frontpack. Detail-rich finishes; same materials policy.'),
        ]),
        blocks: [
            { blockType: 'collection', handle: 'accessories', title: 'Shop accessories', layout: 'grid', limit: 12 },
        ],
        seo: {
            title: 'Accessories — Nordcom Demo Shop',
            description: 'Beanie, sunnies, frontpack — same considered materials, smaller silhouettes.',
            keywords: ['accessories'],
        },
    },
];
