import type { Doc } from '../../../../convex/convex/_generated/dataModel';

/**
 * Header fixture for the seeded demo tenant, ported verbatim from the Mongo seed
 * (`@nordcom/commerce-test-mongo`'s `seed/fixtures/header.ts`) into the Convex-native
 * `header` table shape. Exercises every render path the storefront mega-menu cares about:
 *
 *   - all three top-level variants (`editorial-columns`, `featured-promo`, `compact-list`)
 *   - per-item `description` so editorial-style mega-panels have copy
 *
 * **Depth:** multiple branches reach five levels deep
 * (`Shop → Womenswear → Tops → Hoodies → Soft Cotton Hoodie in Jam`,
 *  `Shop → Shoes → Sneakers → Leather → White leather sneakers`,
 *  `Shop → Accessories → Eyewear → Sunglasses → Black sunnies`, …) so the storefront
 * renderer + admin tree-view both have non-trivial material. The schema allows depth 6;
 * the fixture deliberately stops at five to match what a real merchant IA would build.
 *
 * Links target real mock.shop collections + products so every node in the menu resolves
 * through the storefront route tree.
 */

/** The Convex `header.items[*].link` value shape (a CMS link descriptor). */
type LinkValue = NonNullable<NonNullable<Doc<'header'>['items']>[number]['link']>;

/** A nested (non-top-level) header navigation item — no `variant` discriminator. */
type NavItem = NonNullable<NonNullable<Doc<'header'>['items']>[number]['items']>[number];

/** A top-level header navigation item, carrying the mega-menu `variant`. */
type TopLevelNavItem = NonNullable<Doc<'header'>['items']>[number];

/** The portion of a `header` row the seed fixture supplies; `shop`/timestamps are stamped at insert. */
export type HeaderSeed = Omit<Doc<'header'>, '_id' | '_creationTime' | 'shop' | 'createdAt' | 'updatedAt'>;

/**
 * Builds an external CMS link descriptor (the only link kind the fixture uses).
 *
 * @param label - Visible link text.
 * @param url - Internal/external URL the link points at.
 * @returns A link value with `kind: 'external'` opening in the same tab.
 */
const externalLink = (label: string, url: string): LinkValue => ({
    kind: 'external',
    label,
    url,
    openInNewTab: false,
});

/**
 * Builds a leaf navigation item (no children).
 *
 * @param label - Visible link text.
 * @param url - URL the leaf points at.
 * @param description - Optional editorial copy rendered in mega-panels.
 * @returns A childless {@link NavItem}.
 */
const leaf = (label: string, url: string, description?: string): NavItem => ({
    link: externalLink(label, url),
    ...(description ? { description } : {}),
});

/**
 * Builds a branch navigation item carrying child items.
 *
 * @param label - Visible link text.
 * @param url - URL the branch header points at.
 * @param items - Child navigation items one level deeper.
 * @param description - Optional editorial copy rendered in mega-panels.
 * @returns A {@link NavItem} with a populated `items` array.
 */
const branch = (label: string, url: string, items: NavItem[], description?: string): NavItem => ({
    link: externalLink(label, url),
    ...(description ? { description } : {}),
    items,
});

// Shop → Womenswear → … (multiple 5-level paths)
const womenswear: NavItem = branch(
    'Womenswear',
    '/collections/women/',
    [
        branch('Tops', '/collections/tops/', [
            branch(
                'Hoodies',
                '/collections/tops/',
                [
                    leaf('Soft Cotton Hoodie in Jam', '/products/soft-cotton-hoodie-in-jam/'),
                    leaf('Soft Cotton Hoodie in Clay', '/products/soft-cotton-hoodie-in-clay/'),
                    leaf('Soft Cotton Hoodie in Ocean', '/products/soft-cotton-hoodie-in-ocean/'),
                    leaf('Soft Cotton Hoodie in Violet', '/products/soft-cotton-hoodie-in-violet/'),
                    leaf('Soft Cotton Hoodie in Green', '/products/soft-cotton-hoodie-in-green/'),
                ],
                'Loopback cotton, garment-dyed in Porto. Five colourways.',
            ),
            branch('Crewnecks & tees', '/collections/tops/', [
                leaf("Women's crewneck", '/products/women-crewneck/'),
                leaf("Women's T-shirt", '/products/women-t-shirt/'),
                leaf('Half-zip', '/products/half-zip/'),
                leaf('Workout shirt', '/products/workout-shirt/'),
            ]),
        ]),
        branch('Bottoms', '/collections/bottoms/', [
            branch('Athleisure', '/collections/bottoms/', [
                leaf('Sweatpants', '/products/sweatpants/'),
                leaf('Leggings', '/products/leggings/'),
                leaf('Shorts', '/products/shorts/'),
            ]),
        ]),
        branch('Outerwear', '/collections/women/', [
            branch(
                'Puffers',
                '/collections/women/',
                [
                    leaf('Puffer jacket', '/products/puffer-jacket/'),
                    leaf('Light puffer', '/products/light-puffer/'),
                    leaf('Puffer', '/products/puffer/'),
                ],
                'Recycled-down fill, bluesign-certified shells.',
            ),
        ]),
    ],
    'Considered staples and statement pieces, made to be worn together.',
);

// Shop → Menswear → … (5-level path via Tops → Hoodies & Crewnecks)
const menswear: NavItem = branch('Menswear', '/collections/men/', [
    branch('Tops', '/collections/tops/', [
        branch('Hoodies & crewnecks', '/collections/tops/', [
            leaf('Hoodie', '/products/hoodie/'),
            leaf("Men's crewneck", '/products/men-crewneck/'),
            leaf("Men's T-shirt", '/products/men-t-shirt/'),
            leaf('Half-zip', '/products/half-zip/'),
        ]),
    ]),
    branch('Bottoms', '/collections/bottoms/', [
        branch('Casual', '/collections/bottoms/', [
            leaf('Sweatpants', '/products/sweatpants/'),
            leaf('Shorts', '/products/shorts/'),
        ]),
    ]),
]);

// Shop → Shoes → Sneakers → Leather → leaf  (5-level)
const shoes: NavItem = branch(
    'Shoes',
    '/collections/shoes/',
    [
        branch('Sneakers', '/collections/shoes/', [
            branch(
                'Leather',
                '/collections/shoes/',
                [
                    leaf('White leather sneakers', '/products/white-leather-sneakers/'),
                    leaf('Gray leather sneakers', '/products/gray-leather-sneakers/'),
                    leaf('High-top sneakers', '/products/high-top-sneakers/'),
                ],
                'Italian leather, rubber soles, built to be resoled.',
            ),
            branch('Canvas & runners', '/collections/shoes/', [
                leaf('Canvas sneakers', '/products/canvas-sneakers/'),
                leaf('Gray runners', '/products/gray-runners/'),
            ]),
        ]),
        leaf('Slides', '/products/slides/'),
    ],
    'Canvas, leather, and lifters.',
);

// Shop → Accessories → Eyewear → Sunglasses → leaf  (5-level)
const accessories: NavItem = branch('Accessories', '/collections/accessories/', [
    branch('Eyewear', '/collections/accessories/', [
        branch('Sunglasses', '/collections/accessories/', [
            leaf('Black sunnies', '/products/black-sunnies/'),
            leaf('Clear sunnies', '/products/clear-sunnies/'),
        ]),
    ]),
    leaf('Beanie', '/products/beanie/'),
    leaf('Frontpack', '/products/frontpack/'),
]);

/** Top-level mega-menu items for the seeded header, one per variant family. */
const items: TopLevelNavItem[] = [
    {
        link: externalLink('Shop', '/collections/featured/'),
        variant: 'editorial-columns',
        description: 'Women, men, shoes, and accessories.',
        backgroundColor: '#0a0a0a',
        items: [womenswear, menswear, shoes, accessories],
    },
    {
        link: externalLink('Featured', '/collections/featured/'),
        variant: 'featured-promo',
        description: 'A rotating capsule curated from current production.',
        items: [
            leaf('All featured', '/collections/featured/'),
            leaf('Unisex', '/collections/unisex/'),
            leaf('Puffer jacket', '/products/puffer-jacket/'),
            leaf('Soft Cotton Hoodie in Jam', '/products/soft-cotton-hoodie-in-jam/'),
        ],
    },
    {
        link: externalLink('Journal', '/journal/'),
        variant: 'compact-list',
        description: 'Long-form writing, lookbooks, and behind the seams.',
        items: [
            leaf('Behind the FW25 lookbook', '/lookbook-fw25/'),
            leaf('Sustainable wool sourcing', '/sustainability/'),
            leaf('Layering guide', '/sustainability/'),
        ],
    },
    {
        link: externalLink('About', '/about/'),
        variant: 'compact-list',
        items: [leaf('Our story', '/about/'), leaf('Sustainability', '/sustainability/'), leaf('Contact', '/contact/')],
    },
    {
        link: externalLink('Help', '/contact/'),
        variant: 'compact-list',
        items: [leaf('Contact', '/contact/'), leaf('About us', '/about/'), leaf('Sustainability', '/sustainability/')],
    },
];

/**
 * The canonical seeded `header` content: the mega-menu items, the locale switcher, the
 * primary CTA, and the home `logoLink`. The Mongo seed's Payload `_status: 'published'`
 * flag is dropped — Convex-native CMS rows carry no draft/publish lifecycle field.
 */
export const headerData: HeaderSeed = {
    logoLink: '/',
    items,
    localeSwitcher: { enabled: true, label: 'Region' },
    cta: { kind: 'external', label: 'Sign up', url: '/newsletter/', openInNewTab: false },
};
