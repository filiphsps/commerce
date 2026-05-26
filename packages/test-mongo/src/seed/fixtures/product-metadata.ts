/**
 * Product-metadata fixtures for the seeded demo tenant. CMS overlay on top
 * of Shopify product handles — exercises the rich `descriptionOverride`
 * field plus the full block stack so storefront PDP overrides render with
 * varied content. Handles point at real mock.shop products so PDP fetches
 * actually resolve.
 *
 * Coverage spans hoodies (colourways), outerwear, sneakers (leather +
 * canvas + runners + high-top), accessories (beanie, sunnies), and the
 * sweatpants / shorts staples — ten products in total.
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

const careBlock = {
    blockType: 'rich-text',
    collapsible: true,
    collapsedByDefault: true,
    collapseLabel: 'Care instructions',
    body: lexicalDoc([
        list([
            'Machine wash cold inside-out with like colours.',
            'Tumble dry low or hang to dry.',
            'Iron inverse if needed; no bleach.',
        ]),
    ]),
};

const lifetimeAlert = {
    blockType: 'alert',
    severity: 'info',
    title: 'Lifetime repair guarantee',
    body: 'We re-stitch, replace zips, and re-loft fill for as long as you own the garment.',
    dismissible: false,
};

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
            careBlock,
            lifetimeAlert,
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
            {
                blockType: 'overview',
                source: 'collection',
                collectionHandle: 'women',
                title: 'Pairs with',
                limit: 4,
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
        shopifyHandle: 'light-puffer',
        descriptionOverride: lexicalDoc([
            heading('The Light Puffer', 'h2'),
            paragraph(
                'Mid-season insulator. 450-fill recycled down in a lightweight ripstop — packs into its own pocket for travel.',
            ),
        ]),
        blocks: [
            careBlock,
            {
                blockType: 'alert',
                severity: 'info',
                title: 'Travel-ready',
                body: 'Packs to ~1 L; fits inside our frontpack with room left for a notebook.',
                dismissible: false,
            },
        ],
        seo: {
            title: 'Light Puffer — Nordcom Demo Shop',
            description: '450-fill recycled down. Packs into its own pocket. Mid-season insulator.',
            keywords: ['light puffer', 'travel', 'outerwear'],
        },
    },
    {
        shopifyHandle: 'soft-cotton-hoodie-in-jam',
        descriptionOverride: lexicalDoc([
            heading('The Soft Cotton Hoodie', 'h2'),
            paragraph(
                'A 380 g/m² loopback cotton hoodie cut and sewn in Porto. The "jam" colourway is a deep berry tone garment-dyed for a lived-in feel from day one.',
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
                                        '380 g/m² loopback. 100% long-staple Egyptian cotton, garment-dyed, pre-shrunk.',
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
                                        'Regular through the chest, slightly cropped through the body. Between sizes? Size up for a relaxed silhouette.',
                                    ),
                                ]),
                            },
                        ],
                    },
                ],
            },
            careBlock,
            {
                blockType: 'overview',
                source: 'collection',
                collectionHandle: 'tops',
                title: 'Other colourways',
                limit: 6,
            },
        ],
        seo: {
            title: 'Soft Cotton Hoodie in Jam — Nordcom Demo Shop',
            description: '380 g/m² loopback Egyptian cotton, garment-dyed in Porto. Softens with every wash.',
            keywords: ['hoodie', 'cotton', 'tops'],
        },
    },
    {
        shopifyHandle: 'soft-cotton-hoodie-in-ocean',
        descriptionOverride: lexicalDoc([
            heading('The Soft Cotton Hoodie — Ocean', 'h2'),
            paragraph('Deep navy-blue garment dye. Same heavyweight loopback Egyptian cotton; same cut.'),
        ]),
        blocks: [careBlock],
        seo: {
            title: 'Soft Cotton Hoodie in Ocean — Nordcom Demo Shop',
            description: 'Deep navy garment-dyed loopback hoodie. 380 g/m² Egyptian cotton, cut in Porto.',
        },
    },
    {
        shopifyHandle: 'men-t-shirt',
        descriptionOverride: lexicalDoc([
            heading("Men's T-shirt", 'h2'),
            paragraph(
                'A 200 g/m² long-staple cotton T-shirt with a slightly heavier feel than the supermarket benchmark. Set-in sleeves, ribbed neck, side-vent.',
            ),
        ]),
        blocks: [careBlock],
        seo: {
            title: "Men's T-shirt — Nordcom Demo Shop",
            description: '200 g/m² long-staple cotton T-shirt. Cut in Porto, garment-washed, drops in five sizes.',
        },
    },
    {
        shopifyHandle: 'sweatpants',
        descriptionOverride: lexicalDoc([
            heading('Sweatpants', 'h2'),
            paragraph(
                'Loopback cotton sweatpants with a drawstring waist (no elastic). Tapered below the knee, side-pockets, and a single rear-welt pocket.',
            ),
        ]),
        blocks: [
            {
                blockType: 'alert',
                severity: 'success',
                title: 'New colourways for SS26',
                body: 'Three new colours land 1 March — sage, oat, and washed black. Sign up for the newsletter to be notified.',
                dismissible: true,
            },
            careBlock,
        ],
        seo: {
            title: 'Sweatpants — Nordcom Demo Shop',
            description: 'Loopback cotton sweatpants with a drawstring waist. Cut and sewn in Porto.',
        },
    },
    {
        shopifyHandle: 'canvas-sneakers',
        descriptionOverride: lexicalDoc([
            heading('Canvas Sneakers', 'h2'),
            paragraph(
                'A summer cup-soled sneaker on a wide last. Heavyweight Italian canvas upper, vulcanised rubber sole, and a removable insole replaced free for life.',
            ),
        ]),
        blocks: [
            lifetimeAlert,
            {
                blockType: 'rich-text',
                collapsible: true,
                collapsedByDefault: true,
                collapseLabel: 'Sizing',
                body: lexicalDoc([
                    paragraph(
                        'Run true to size on a wide last. If you are between sizes or have narrower feet, size down half a size.',
                    ),
                ]),
            },
        ],
        seo: {
            title: 'Canvas Sneakers — Nordcom Demo Shop',
            description:
                'Cup-soled canvas sneakers on a wide last. Italian canvas, vulcanised rubber, made to be resoled.',
        },
    },
    {
        shopifyHandle: 'white-leather-sneakers',
        descriptionOverride: lexicalDoc([
            heading('White Leather Sneakers', 'h2'),
            paragraph(
                'Italian cup-soled leather sneaker on the same wide last as our canvas range. Full-grain leather upper, leather lining, vulcanised rubber outsole.',
            ),
        ]),
        blocks: [
            lifetimeAlert,
            {
                blockType: 'media-grid',
                itemType: 'icon',
                columns: 4,
                items: [
                    { caption: 'Full-grain leather' },
                    { caption: 'Leather lining' },
                    { caption: 'Made in Italy' },
                    { caption: 'Free resoles' },
                ],
            },
        ],
        seo: {
            title: 'White Leather Sneakers — Nordcom Demo Shop',
            description:
                'Italian cup-soled white leather sneaker. Full-grain upper, leather lined, free resoles for life.',
        },
    },
    {
        shopifyHandle: 'beanie',
        descriptionOverride: lexicalDoc([
            heading('Beanie', 'h2'),
            paragraph(
                'A hand-finished merino-wool beanie. Two-ply heavyweight rib; no synthetic blend. Folded cuff sits high on the brow.',
            ),
        ]),
        blocks: [careBlock],
        seo: {
            title: 'Beanie — Nordcom Demo Shop',
            description: 'Two-ply merino wool beanie. Hand-finished, no synthetic blend, made in Värmland.',
        },
    },
    {
        shopifyHandle: 'black-sunnies',
        descriptionOverride: lexicalDoc([
            heading('Black Sunnies', 'h2'),
            paragraph(
                'Bio-acetate frames cast in Italy; CR-39 lenses with hard-coat and oleophobic finish. UV400. Unisex shape, slightly rounded silhouette.',
            ),
        ]),
        blocks: [
            {
                blockType: 'alert',
                severity: 'info',
                title: 'Prescription-ready',
                body: 'These frames take prescription lenses up to ±6.00. Bring them to any optician or use our concierge partner.',
                dismissible: false,
            },
        ],
        seo: {
            title: 'Black Sunnies — Nordcom Demo Shop',
            description: 'Italian bio-acetate frames, UV400 CR-39 lenses. Prescription-ready up to ±6.00.',
        },
    },
];
