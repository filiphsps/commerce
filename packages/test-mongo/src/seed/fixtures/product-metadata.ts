/**
 * Product-metadata fixtures for the seeded demo tenant. CMS overlay on top
 * of Shopify product handles — exercises the rich `descriptionOverride`
 * field plus the full block stack so storefront PDP overrides render with
 * varied content.
 *
 * Handles point at the live mock.shop catalogue so storefront product reads
 * actually resolve through the CommerceProvider — `puffer-jacket`,
 * `soft-cotton-hoodie-in-jam`, etc. all exist on https://mock.shop/api.
 */

import { heading, lexicalDoc, list, paragraph } from './lexical';

const externalLink = (label: string, url: string): Record<string, unknown> => ({
    kind: 'external',
    label,
    url,
    openInNewTab: false,
});

export interface ProductMetadataFixture {
    shopifyHandle: string;
    descriptionOverride: Record<string, unknown>;
    blocks: Array<Record<string, unknown>>;
    seo: Record<string, unknown>;
}

export const productMetadataFixtures: ProductMetadataFixture[] = [
    {
        shopifyHandle: 'puffer-jacket',
        descriptionOverride: lexicalDoc([
            heading('The Puffer Jacket', 'h2'),
            paragraph(
                'Our flagship insulator: 600-fill recycled goose down in a bluesign®-certified ripstop shell. Cut for layering — sized to take a chunky knit underneath without binding at the shoulder.',
            ),
            heading('Specs', 'h3'),
            list([
                'Shell: 100% recycled polyamide ripstop.',
                'Fill: 600-fill recycled goose down (RDS-certified).',
                'Lining: 100% recycled polyamide taffeta.',
                'Made in Portugal.',
            ]),
        ]),
        blocks: [
            {
                blockType: 'rich-text',
                collapsible: true,
                collapsedByDefault: false,
                collapseLabel: 'Care instructions',
                body: lexicalDoc([
                    list([
                        'Machine wash cold with a down-safe detergent.',
                        'Tumble dry low with two clean tennis balls until fully dry.',
                        'Store loose on a wide hanger — never compressed for long periods.',
                    ]),
                ]),
            },
            {
                blockType: 'alert',
                severity: 'info',
                title: 'Lifetime repair guarantee',
                body: 'We re-stitch baffles, replace zips, and re-loft fill for as long as you own the jacket.',
                dismissible: false,
            },
            {
                blockType: 'media-grid',
                itemType: 'image',
                columns: 3,
                items: [
                    { caption: 'Baffles up close', link: externalLink('Material breakdown', '/sustainability/') },
                    { caption: 'Lived-in, season three' },
                    { caption: 'On location, Lofoten' },
                ],
            },
        ],
        seo: {
            title: 'Puffer Jacket — Nordcom Demo Shop',
            description:
                '600-fill recycled goose down in a bluesign-certified ripstop shell. Made in Portugal, repaired for life.',
            keywords: ['recycled down', 'puffer', 'outerwear'],
        },
    },
    {
        shopifyHandle: 'soft-cotton-hoodie-in-jam',
        descriptionOverride: lexicalDoc([
            heading('The Soft Cotton Hoodie', 'h2'),
            paragraph(
                'A 380 g/m² loopback cotton hoodie cut and sewn in Porto. The "jam" colourway is a deep berry tone garment-dyed for a lived-in feel from day one.',
            ),
            paragraph(
                'Long-staple Egyptian cotton means it gets softer with every wash without losing structure. Set-in sleeves, kangaroo pocket, ribbed cuffs and hem.',
            ),
        ]),
        blocks: [
            {
                blockType: 'columns',
                columns: [
                    {
                        width: '1/2',
                        content: [
                            {
                                blockType: 'rich-text',
                                body: lexicalDoc([
                                    heading('Fabric', 'h3'),
                                    paragraph(
                                        '380 g/m² loopback. 100% long-staple Egyptian cotton, garment-dyed. Pre-shrunk in finishing.',
                                    ),
                                ]),
                            },
                        ],
                    },
                    {
                        width: '1/2',
                        content: [
                            {
                                blockType: 'rich-text',
                                body: lexicalDoc([
                                    heading('Fit', 'h3'),
                                    paragraph(
                                        'Regular through the chest, slightly cropped through the body. If between sizes, we recommend sizing up for a relaxed silhouette.',
                                    ),
                                ]),
                            },
                        ],
                    },
                ],
            },
            {
                blockType: 'overview',
                source: 'collection',
                collectionHandle: 'tops',
                title: 'Other tops',
                limit: 4,
            },
        ],
        seo: {
            title: 'Soft Cotton Hoodie in Jam — Nordcom Demo Shop',
            description: '380 g/m² loopback Egyptian cotton, garment-dyed in Porto. Softens with every wash.',
            keywords: ['hoodie', 'cotton', 'tops'],
        },
    },
];
