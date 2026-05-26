/**
 * Product-metadata fixtures for the seeded demo tenant. CMS overlay on top
 * of Shopify product handles — exercises the rich `descriptionOverride`
 * field plus the full block stack so storefront PDP overrides render with
 * varied content.
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
        shopifyHandle: 'recycled-down-puffer',
        descriptionOverride: lexicalDoc([
            heading('The Recycled-down Puffer', 'h2'),
            paragraph(
                'Our flagship insulator: 600-fill recycled goose down, reclaimed from post-consumer bedding and re-sterilised by Allied Feather + Down in Vernon, California.',
            ),
            paragraph(
                'The shell is a polyamide ripstop dyed with bluesign®-certified pigments. Cut for layering — sized to take a chunky knit underneath without binding at the shoulder.',
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
            title: 'Recycled-down Puffer — Nordcom Demo Shop',
            description:
                '600-fill recycled goose down in a bluesign-certified ripstop shell. Made in Portugal, repaired for life.',
            keywords: ['recycled down', 'puffer', 'outerwear'],
        },
    },
    {
        shopifyHandle: 'wool-overcoat',
        descriptionOverride: lexicalDoc([
            heading('The Wool Overcoat', 'h2'),
            paragraph(
                'A heavyweight (520 g/m²) double-faced wool from Klässbols, Värmland. Built around an unstructured shoulder so it wears more like a knit than a tailored coat.',
            ),
            paragraph(
                'Buttons are pressed horn from the Czech Republic. Lining is a cupro / wool blend that breathes — most overcoats trap heat; this one does not.',
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
                                        '520 g/m² double-faced virgin wool from Klässbols, Värmland. Worsted twist, brushed finish.',
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
                                        'True-to-size with room for a fisherman knit. Drop shoulder, mid-thigh length. If between sizes, we recommend sizing down.',
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
                collectionHandle: 'tailoring',
                title: 'Pairs with',
                limit: 4,
            },
        ],
        seo: {
            title: 'Wool Overcoat — Nordcom Demo Shop',
            description:
                'Heavyweight double-faced Värmland wool. Unstructured shoulder, horn buttons, breathing lining.',
            keywords: ['wool', 'overcoat', 'tailoring'],
        },
    },
];
