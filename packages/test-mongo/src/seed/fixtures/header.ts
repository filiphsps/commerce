/**
 * Header fixture for the seeded demo tenant. Exercises every render path
 * the storefront mega-menu cares about:
 *
 *   - all three top-level variants (`editorial-columns`, `compact-list`,
 *     `featured-promo`)
 *   - five levels of nested `items` arrays — matches the schema cap of
 *     `topLevelNavItemField({ depth: 5 })`
 *   - per-item `description`, `backgroundColor`, and `image` fields so
 *     editorial-style mega-panels have real content to display
 *
 * Keep the labels representative of a real fashion-commerce IA (women →
 * outerwear → jackets → down → specific styles) rather than `Sub 1 / Sub 2`
 * placeholders; E2E snapshots and a11y selectors lean on natural text.
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
    '/women/',
    [
        branch(
            'Outerwear',
            '/women/outerwear/',
            [
                branch('Jackets', '/women/outerwear/jackets/', [
                    branch('Down jackets', '/women/outerwear/jackets/down/', [
                        leaf('Recycled-down puffer', '/women/outerwear/jackets/down/recycled-puffer/'),
                        leaf('Lightweight micro-puffer', '/women/outerwear/jackets/down/micro-puffer/'),
                        leaf('Expedition parka', '/women/outerwear/jackets/down/expedition-parka/'),
                    ]),
                    branch('Wool jackets', '/women/outerwear/jackets/wool/', [
                        leaf('Tailored blazer', '/women/outerwear/jackets/wool/tailored-blazer/'),
                        leaf('Boucle bouclé', '/women/outerwear/jackets/wool/boucle/'),
                    ]),
                    leaf('Leather jackets', '/women/outerwear/jackets/leather/'),
                    leaf('Denim jackets', '/women/outerwear/jackets/denim/'),
                ]),
                branch('Coats', '/women/outerwear/coats/', [
                    leaf('Trench coats', '/women/outerwear/coats/trench/'),
                    leaf('Pea coats', '/women/outerwear/coats/pea/'),
                    leaf('Overcoats', '/women/outerwear/coats/overcoats/'),
                ]),
                leaf('Vests & gilets', '/women/outerwear/vests/'),
            ],
            'Built to last from the first rainfall to the deepest freeze.',
        ),
        branch('Knitwear', '/women/knitwear/', [
            leaf('Sweaters', '/women/knitwear/sweaters/'),
            leaf('Cardigans', '/women/knitwear/cardigans/'),
            leaf('Turtlenecks', '/women/knitwear/turtlenecks/'),
            leaf('Vests', '/women/knitwear/vests/'),
        ]),
        branch('Tops', '/women/tops/', [
            leaf('Shirts', '/women/tops/shirts/'),
            leaf('Blouses', '/women/tops/blouses/'),
            leaf('T-shirts', '/women/tops/tshirts/'),
            leaf('Tank tops', '/women/tops/tanks/'),
        ]),
        branch('Bottoms', '/women/bottoms/', [
            leaf('Trousers', '/women/bottoms/trousers/'),
            leaf('Jeans', '/women/bottoms/jeans/'),
            leaf('Skirts', '/women/bottoms/skirts/'),
            leaf('Shorts', '/women/bottoms/shorts/'),
        ]),
    ],
    'Considered staples and statement pieces, made to be worn together.',
);

const menswear: NavItem = branch('Menswear', '/men/', [
    branch('Outerwear', '/men/outerwear/', [
        branch('Jackets', '/men/outerwear/jackets/', [
            leaf('Field jackets', '/men/outerwear/jackets/field/'),
            leaf('Down jackets', '/men/outerwear/jackets/down/'),
            leaf('Bomber jackets', '/men/outerwear/jackets/bomber/'),
        ]),
        leaf('Coats', '/men/outerwear/coats/'),
    ]),
    leaf('Suits & tailoring', '/men/tailoring/'),
    leaf('Knitwear', '/men/knitwear/'),
    leaf('Shirts', '/men/shirts/'),
    leaf('Trousers', '/men/trousers/'),
]);

const collections: NavItem = branch(
    'Collections',
    '/collections/',
    [
        leaf('Spring/Summer 2026', '/collections/ss26/'),
        leaf('Fall/Winter 2025', '/collections/fw25/'),
        leaf('Capsule: Nordic Light', '/collections/nordic-light/'),
        leaf('Archive sale', '/collections/archive/'),
    ],
    'Seasonal stories curated by our design team.',
);

export const headerData: { items: TopLevelNavItem[] } = {
    items: [
        {
            link: externalLink('Shop', '/shop/'),
            variant: 'editorial-columns',
            description: 'Womenswear, menswear, and seasonal collections.',
            backgroundColor: '#0a0a0a',
            items: [womenswear, menswear, collections],
        },
        {
            link: externalLink('Journal', '/journal/'),
            variant: 'featured-promo',
            description: 'Long-form writing, lookbooks, and behind the seams.',
            items: [
                branch('Latest articles', '/journal/latest/', [
                    leaf('Behind the FW25 lookbook', '/journal/articles/behind-the-fw25-lookbook/'),
                    leaf('Sustainable wool sourcing', '/journal/articles/sustainable-wool-sourcing/'),
                    leaf('How to layer for winter', '/journal/articles/winter-layering-guide/'),
                ]),
                leaf('Style guides', '/journal/style/'),
                leaf('Lookbooks', '/journal/lookbooks/'),
                leaf('Interviews', '/journal/interviews/'),
            ],
        },
        {
            link: externalLink('Stores', '/stores/'),
            variant: 'compact-list',
            description: 'Flagships, pop-ups, and stockists worldwide.',
            items: [
                leaf('Stockholm flagship', '/stores/stockholm/'),
                leaf('Copenhagen', '/stores/copenhagen/'),
                leaf('Oslo', '/stores/oslo/'),
                leaf('Berlin pop-up', '/stores/berlin/'),
                leaf('All stockists', '/stores/stockists/'),
            ],
        },
        {
            link: externalLink('About', '/about/'),
            variant: 'compact-list',
            items: [
                leaf('Our story', '/about/'),
                leaf('Sustainability', '/sustainability/'),
                leaf('Press', '/press/'),
                leaf('Careers', '/careers/'),
            ],
        },
        {
            link: externalLink('Help', '/help/'),
            variant: 'compact-list',
            items: [
                leaf('Contact', '/contact/'),
                leaf('Shipping & delivery', '/help/shipping/'),
                leaf('Returns', '/help/returns/'),
                leaf('Size guide', '/help/size-guide/'),
                leaf('FAQ', '/help/faq/'),
            ],
        },
    ],
};
