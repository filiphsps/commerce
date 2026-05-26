/**
 * Header fixture for the seeded demo tenant. Exercises every render path
 * the storefront mega-menu cares about:
 *
 *   - all three top-level variants (`editorial-columns`, `compact-list`,
 *     `featured-promo`)
 *   - six levels of nested `items` arrays — matches the schema cap of
 *     `topLevelNavItemField({ depth: 6 })`
 *   - per-item `description` so editorial-style mega-panels have copy to
 *     display
 *
 * Links target real mock.shop collections (`men`, `women`, `featured`,
 * `tops`, `bottoms`, `shoes`, `accessories`) and products (`puffer-jacket`,
 * `soft-cotton-hoodie-in-jam`, `slides`, …) so every node in the menu
 * actually resolves through the storefront route tree instead of 404'ing.
 * Page slugs (`/about/`, `/sustainability/`, `/contact/`) match the
 * pages fixture for the same reason.
 */

const externalLink = (label: string, url: string): Record<string, unknown> => ({
    kind: 'external',
    label,
    url,
    openInNewTab: false,
});

type NavItem = {
    link: Record<string, unknown>;
    description?: string;
    backgroundColor?: string;
    items?: NavItem[];
};

type TopLevelNavItem = NavItem & {
    variant: 'editorial-columns' | 'compact-list' | 'featured-promo';
};

const leaf = (label: string, url: string, description?: string): NavItem => ({
    link: externalLink(label, url),
    ...(description ? { description } : {}),
});

const branch = (label: string, url: string, items: NavItem[], description?: string): NavItem => ({
    link: externalLink(label, url),
    ...(description ? { description } : {}),
    items,
});

const womenswear: NavItem = branch(
    'Womenswear',
    '/collections/women/',
    [
        branch(
            'Tops',
            '/collections/tops/',
            [
                branch('Hoodies', '/collections/tops/', [
                    branch('Soft Cotton Hoodies', '/products/soft-cotton-hoodie-in-jam/', [
                        leaf('Soft Cotton Hoodie in Jam', '/products/soft-cotton-hoodie-in-jam/'),
                        leaf('Soft Cotton Hoodie in Clay', '/products/soft-cotton-hoodie-in-clay/'),
                        leaf('Soft Cotton Hoodie in Ocean', '/products/soft-cotton-hoodie-in-ocean/'),
                        leaf('Soft Cotton Hoodie in Violet', '/products/soft-cotton-hoodie-in-violet/'),
                        leaf('Soft Cotton Hoodie in Green', '/products/soft-cotton-hoodie-in-green/'),
                    ]),
                    leaf('Half-zip', '/products/half-zip/'),
                    leaf('Crewneck', '/products/women-crewneck/'),
                    leaf('Workout shirt', '/products/workout-shirt/'),
                ]),
                leaf("Women's T-shirt", '/products/women-t-shirt/'),
            ],
            'Loopback cotton, garment-dyed in Porto. Five colourways.',
        ),
        branch('Bottoms', '/collections/bottoms/', [
            leaf('Sweatpants', '/products/sweatpants/'),
            leaf('Leggings', '/products/leggings/'),
            leaf('Shorts', '/products/shorts/'),
        ]),
        branch('Outerwear', '/collections/women/', [
            leaf('Puffer jacket', '/products/puffer-jacket/'),
            leaf('Light puffer', '/products/light-puffer/'),
            leaf('Puffer', '/products/puffer/'),
        ]),
    ],
    'Considered staples and statement pieces, made to be worn together.',
);

const menswear: NavItem = branch('Menswear', '/collections/men/', [
    branch('Tops', '/collections/tops/', [
        leaf("Men's T-shirt", '/products/men-t-shirt/'),
        leaf('Crewneck', '/products/men-crewneck/'),
        leaf('Hoodie', '/products/hoodie/'),
    ]),
    branch('Bottoms', '/collections/bottoms/', [
        leaf('Sweatpants', '/products/sweatpants/'),
        leaf('Shorts', '/products/shorts/'),
    ]),
    leaf('Outerwear', '/collections/men/'),
]);

const shoes: NavItem = branch(
    'Shoes',
    '/collections/shoes/',
    [
        leaf('Canvas sneakers', '/products/canvas-sneakers/'),
        leaf('White leather sneakers', '/products/white-leather-sneakers/'),
        leaf('Gray leather sneakers', '/products/gray-leather-sneakers/'),
        leaf('Gray runners', '/products/gray-runners/'),
        leaf('High-top sneakers', '/products/high-top-sneakers/'),
        leaf('Slides', '/products/slides/'),
    ],
    'Canvas, leather, and lifters for the lifters.',
);

const accessories: NavItem = branch('Accessories', '/collections/accessories/', [
    leaf('Beanie', '/products/beanie/'),
    leaf('Black sunnies', '/products/black-sunnies/'),
    leaf('Clear sunnies', '/products/clear-sunnies/'),
    leaf('Frontpack', '/products/frontpack/'),
]);

export const headerData: { items: TopLevelNavItem[] } = {
    items: [
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
            items: [
                leaf('Our story', '/about/'),
                leaf('Sustainability', '/sustainability/'),
                leaf('Contact', '/contact/'),
            ],
        },
        {
            link: externalLink('Help', '/contact/'),
            variant: 'compact-list',
            items: [
                leaf('Contact', '/contact/'),
                leaf('About us', '/about/'),
                leaf('Sustainability', '/sustainability/'),
            ],
        },
    ],
};
