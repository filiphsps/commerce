/**
 * Product-metadata fixtures for the seeded demo tenant, ported from the Mongo seed
 * (`@nordcom/commerce-test-mongo`'s `seed/fixtures/product-metadata.ts`) into the
 * Convex-native `productMetadata` table shape — same 29-product corpus, but every
 * rich-text body (`descriptionOverride` plus block-embedded bodies) is converted to
 * ProseMirror JSON through the real CMSRICH-04 codec via {@link prose}.
 *
 * CMS overlay on top of Shopify product handles — every product mock.shop returns
 * from `{ products(first: 100) }` gets a matching CMS entry so the storefront PDP
 * override path renders for any product the user clicks into. Headliner products
 * (`puffer-jacket`, the Soft Cotton Hoodie colourways, the sneaker range) get richer
 * block stacks; basics share the `simpleProduct` template plus the shared
 * `careBlock` / `lifetimeAlert` helpers.
 */

import type { Doc } from '../../../../convex/convex/_generated/dataModel';
import { heading, list, paragraph, prose } from './richtext';

/** The portion of a `productMetadata` row the seed fixture supplies; `shop`/timestamps are stamped at insert. */
export type ProductMetadataSeed = Omit<
    Doc<'productMetadata'>,
    '_id' | '_creationTime' | 'shop' | 'createdAt' | 'updatedAt'
>;

/**
 * Builds the `external` link shape the link-field blocks embed.
 *
 * @param label - The visible link label.
 * @param url - The destination URL (trailing-slash internal path or absolute).
 * @returns The serialized link object.
 */
const externalLink = (label: string, url: string): Record<string, unknown> => ({
    kind: 'external',
    label,
    url,
    openInNewTab: false,
});

const careBlock = {
    blockType: 'rich-text',
    collapsible: true,
    collapsedByDefault: true,
    collapseLabel: 'Care instructions',
    body: prose([
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

/**
 * Builds the SEO group shared by every product entry, suffixing the shop name onto the title.
 *
 * @param title - The product display title.
 * @param description - The SEO description.
 * @param keywords - Optional keyword list; omitted from the group when absent.
 * @returns The serialized SEO group.
 */
const seo = (title: string, description: string, keywords?: string[]): NonNullable<ProductMetadataSeed['seo']> => ({
    title: `${title} — Nordcom Demo Shop`,
    description,
    ...(keywords ? { keywords } : {}),
});

/**
 * Thin-template product entry: a three-block description override (heading + summary + detail)
 * plus the shared care block and any extra blocks — keeps the long tail of basics maintainable.
 *
 * @param handle - The Shopify product handle the entry overlays.
 * @param displayTitle - The display title used in the override heading and SEO title.
 * @param summary - The one-line summary paragraph.
 * @param description - The longer detail paragraph.
 * @param seoDescription - The SEO description.
 * @param keywords - Optional SEO keywords.
 * @param extraBlocks - Blocks appended after the shared care block.
 * @returns The complete fixture entry.
 */
const simpleProduct = (
    handle: string,
    displayTitle: string,
    summary: string,
    description: string,
    seoDescription: string,
    keywords?: string[],
    extraBlocks: Array<Record<string, unknown>> = [],
): ProductMetadataSeed => ({
    shopifyHandle: handle,
    descriptionOverride: prose([heading(displayTitle, 'h2'), paragraph(summary), paragraph(description)]),
    blocks: [careBlock, ...extraBlocks],
    seo: seo(displayTitle, seoDescription, keywords),
});

export const productMetadataFixtures: ProductMetadataSeed[] = [
    // ─── Headliners ─────────────────────────────────────────────────────────
    {
        shopifyHandle: 'puffer-jacket',
        descriptionOverride: prose([
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
            { blockType: 'overview', source: 'collection', collectionHandle: 'women', title: 'Pairs with', limit: 4 },
        ],
        seo: seo(
            'Puffer Jacket',
            '600-fill recycled goose down in a bluesign-certified ripstop shell. Made in Portugal, repaired for life.',
            ['recycled down', 'puffer', 'outerwear'],
        ),
    },
    {
        shopifyHandle: 'light-puffer',
        descriptionOverride: prose([
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
        seo: seo('Light Puffer', '450-fill recycled down. Packs into its own pocket. Mid-season insulator.', [
            'light puffer',
            'travel',
            'outerwear',
        ]),
    },
    simpleProduct(
        'puffer',
        'The Puffer',
        'Heritage block-colour puffer — 550-fill recycled down, matte ripstop shell, oversized cuff.',
        'Cut on the same last as the puffer-jacket but with a quilted exterior and a single chest pocket. Wears looser through the body.',
        '550-fill recycled down puffer with a matte ripstop shell. Heritage block-colour palette.',
        ['puffer', 'outerwear'],
        [lifetimeAlert],
    ),

    // ─── Soft Cotton Hoodie colourways ──────────────────────────────────────
    {
        shopifyHandle: 'soft-cotton-hoodie-in-jam',
        descriptionOverride: prose([
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
                                body: prose([
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
                                body: prose([
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
        seo: seo(
            'Soft Cotton Hoodie in Jam',
            '380 g/m² loopback Egyptian cotton, garment-dyed in Porto. Softens with every wash.',
            ['hoodie', 'cotton', 'tops'],
        ),
    },
    simpleProduct(
        'soft-cotton-hoodie-in-clay',
        'The Soft Cotton Hoodie — Clay',
        'Warm earth-tone garment dye. Same heavyweight loopback Egyptian cotton; same cut.',
        'A muted reddish-brown that reads dustier in daylight than online photography suggests. Pairs with everything you already own.',
        'Earth-tone garment-dyed loopback hoodie. 380 g/m² Egyptian cotton, cut in Porto.',
    ),
    simpleProduct(
        'soft-cotton-hoodie-in-ocean',
        'The Soft Cotton Hoodie — Ocean',
        'Deep navy-blue garment dye. Same heavyweight loopback Egyptian cotton; same cut.',
        'Ocean is the most "wardrobe-safe" colourway — pairs with denim, grey trousers, or the matching sweatpants.',
        'Deep navy garment-dyed loopback hoodie. 380 g/m² Egyptian cotton, cut in Porto.',
    ),
    simpleProduct(
        'soft-cotton-hoodie-in-violet',
        'The Soft Cotton Hoodie — Violet',
        'Saturated cool-violet garment dye. Limited production run.',
        'A new SS26 colour. Two-week dye-batch reservation; expect slight tonal variance between units.',
        'Limited-edition violet garment-dyed loopback hoodie. 380 g/m² Egyptian cotton.',
    ),
    simpleProduct(
        'soft-cotton-hoodie-in-green',
        'The Soft Cotton Hoodie — Green',
        'A deep forest green that leans muted under indoor light.',
        'Pairs with the gray-runners and the canvas-sneakers; reads almost charcoal under tungsten.',
        'Forest-green garment-dyed loopback hoodie. 380 g/m² Egyptian cotton, made in Porto.',
    ),

    // ─── Cotton basics ──────────────────────────────────────────────────────
    simpleProduct(
        'hoodie',
        'The Hoodie',
        'Our reference hoodie — same 380 g/m² loopback as the colourway range, in a single core grey marl.',
        'If you only own one hoodie, this is it. Standard fit, drawstring hood, double-stitched seams.',
        '380 g/m² loopback hoodie in core grey marl. The reference fit.',
        ['hoodie'],
    ),
    simpleProduct(
        'hoodie-old',
        'The Hoodie (heritage cut)',
        'The original hoodie we launched with in 2018, retained for collectors. Thinner shoulder pad, longer body.',
        'A heritage cut we have kept in production for the customers who learned the brand on it. 320 g/m² loopback, slightly cropped sleeve.',
        '320 g/m² heritage-cut hoodie. Retained from our 2018 launch range.',
    ),
    simpleProduct(
        'men-t-shirt',
        "Men's T-shirt",
        '200 g/m² long-staple cotton. Set-in sleeves, ribbed neck, side-vent.',
        'A slightly heavier feel than the supermarket benchmark. Cut to skim, not cling.',
        '200 g/m² long-staple cotton T-shirt. Cut in Porto, drops in five sizes.',
    ),
    simpleProduct(
        'women-t-shirt',
        "Women's T-shirt",
        '200 g/m² long-staple cotton. Trim ribbed neck, gently fitted through the waist.',
        "Same loopback as the men's cut but with a slightly higher armhole and a shorter sleeve.",
        '200 g/m² fitted T-shirt for women. Long-staple cotton, cut in Porto.',
    ),
    simpleProduct(
        'men-crewneck',
        "Men's Crewneck",
        '340 g/m² brushed-back loopback. Crewneck silhouette, ribbed cuff and hem.',
        "The hoodie's quieter cousin. Same fabric, less drama.",
        '340 g/m² brushed loopback crewneck. Ribbed cuff, set-in sleeve.',
    ),
    simpleProduct(
        'women-crewneck',
        "Women's Crewneck",
        '340 g/m² brushed-back loopback. Slightly cropped body, dropped shoulder.',
        'Crops just above the waistband of a high-rise trouser; sleeve reaches mid-thumb.',
        '340 g/m² brushed loopback crewneck for women. Cropped body, dropped shoulder.',
    ),
    simpleProduct(
        'half-zip',
        'Half-Zip',
        '320 g/m² brushed knit pull-over with a YKK two-way zip from neck to chest.',
        'A workhorse layering piece. Wear under outerwear or solo on a transitional day.',
        '320 g/m² brushed half-zip with a YKK two-way zip. Cut in Porto.',
    ),
    simpleProduct(
        'workout-shirt',
        'Workout Shirt',
        '160 g/m² long-staple performance jersey. Quick-drying, low-friction underarm panel.',
        'Built for the gym, not for branding. No logo, no shine, no synthetic mesh.',
        '160 g/m² performance jersey workout shirt. No logo, no shine.',
    ),

    // ─── Bottoms ────────────────────────────────────────────────────────────
    {
        shopifyHandle: 'sweatpants',
        descriptionOverride: prose([
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
        seo: seo('Sweatpants', 'Loopback cotton sweatpants with a drawstring waist. Cut and sewn in Porto.'),
    },
    simpleProduct(
        'shorts',
        'Shorts',
        '180 g/m² French-terry shorts. Above-the-knee, drawstring waist, single rear pocket.',
        'Cut on the same waistband block as the sweatpants — straight swap into the summer wardrobe.',
        'French-terry above-knee shorts. Drawstring waist, cut in Porto.',
    ),
    simpleProduct(
        'leggings',
        'Leggings',
        '4-way stretch performance fabric. High-rise, full-length, no front seam.',
        'Squat-tested for opacity; the seamless front sits flat under a fitted top.',
        'High-rise 4-way stretch leggings. Full-length, seamless front.',
    ),

    // ─── Shoes ──────────────────────────────────────────────────────────────
    {
        shopifyHandle: 'canvas-sneakers',
        descriptionOverride: prose([
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
                body: prose([
                    paragraph(
                        'Run true to size on a wide last. If you are between sizes or have narrower feet, size down half a size.',
                    ),
                ]),
            },
        ],
        seo: seo(
            'Canvas Sneakers',
            'Cup-soled canvas sneakers on a wide last. Italian canvas, vulcanised rubber, made to be resoled.',
        ),
    },
    {
        shopifyHandle: 'white-leather-sneakers',
        descriptionOverride: prose([
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
        seo: seo(
            'White Leather Sneakers',
            'Italian cup-soled white leather sneaker. Full-grain upper, leather lined, free resoles for life.',
        ),
    },
    simpleProduct(
        'gray-leather-sneakers',
        'Gray Leather Sneakers',
        'Italian cup-soled leather sneaker in a soft grey full-grain. Same last + sole construction as the white leather pair.',
        'Slightly more colour-fast under daily wear than the white pair — recommended for travel.',
        'Italian cup-soled grey leather sneakers. Full-grain upper, leather lining, vulcanised sole.',
        ['sneakers', 'leather'],
        [lifetimeAlert],
    ),
    simpleProduct(
        'gray-runners',
        'Gray Runners',
        'A lighter every-day runner. Knit-mesh upper, EVA midsole, rubber waffle outsole.',
        'Built around city pavement, not a track — cushioned but supportive, with a heel-toe drop suited to walking days.',
        'Knit-mesh runners with an EVA midsole. Built for city pavement.',
        ['runners', 'sneakers'],
    ),
    simpleProduct(
        'high-top-sneakers',
        'High-Top Sneakers',
        'Italian high-top cup-soled sneaker. Full-grain leather upper, leather lining, padded ankle collar.',
        'Same wide last as the cup-soled range; size as you would the canvas pair.',
        'Italian high-top cup-soled leather sneakers. Wide-last, padded ankle collar.',
        ['high-top', 'sneakers', 'leather'],
        [lifetimeAlert],
    ),
    simpleProduct(
        'slides',
        'Slides',
        'A heritage cork-footbed slide on a recycled-rubber outsole. Leather upper with a single buckled strap.',
        'The summer slide we have been wearing in the studio since 2019. Mould perfectly to the foot after a week of wear.',
        'Cork-footbed leather slides with a single buckled strap.',
        ['slides', 'shoes'],
    ),

    // ─── Accessories ────────────────────────────────────────────────────────
    {
        shopifyHandle: 'beanie',
        descriptionOverride: prose([
            heading('Beanie', 'h2'),
            paragraph(
                'A hand-finished merino-wool beanie. Two-ply heavyweight rib; no synthetic blend. Folded cuff sits high on the brow.',
            ),
        ]),
        blocks: [careBlock],
        seo: seo('Beanie', 'Two-ply merino wool beanie. Hand-finished, no synthetic blend, made in Värmland.'),
    },
    {
        shopifyHandle: 'black-sunnies',
        descriptionOverride: prose([
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
        seo: seo('Black Sunnies', 'Italian bio-acetate frames, UV400 CR-39 lenses. Prescription-ready up to ±6.00.'),
    },
    simpleProduct(
        'clear-sunnies',
        'Clear Sunnies',
        'Italian bio-acetate frames in a clear-crystal finish. CR-39 lenses with hard-coat and oleophobic finish. UV400.',
        'Same shape + last as the black pair; the clear variant lets the lens tint read more strongly indoors.',
        'Italian clear-crystal acetate frames. UV400, prescription-ready.',
        ['sunglasses', 'accessories'],
    ),
    simpleProduct(
        'frontpack',
        'Frontpack',
        '5 L sling-bag in 16 oz waxed cotton canvas with a leather-trim strap. YKK zips, magnetic side-stash.',
        'Sized to take a paperback, a 13" laptop, or a Light Puffer. Worn front or back.',
        '5 L sling-bag in 16 oz waxed cotton canvas. Sized for a 13-inch laptop.',
        ['bag', 'accessories'],
    ),
];
