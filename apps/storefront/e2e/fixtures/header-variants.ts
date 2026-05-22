import type { Header } from '@nordcom/commerce-cms/types';

// All three mega-menu variants with enough items to exercise every render path.
// Uses `kind: 'external'` links so the fixture works without seeded Page docs.
export const headerItemsWithAllVariants: NonNullable<Header['items']> = [
    {
        id: 'top-editorial',
        link: { kind: 'external', label: 'Editorial', url: '/editorial', openInNewTab: false },
        variant: 'editorial-columns',
        items: [
            {
                id: 'ed-1',
                link: { kind: 'external', label: 'Sour', url: '/sour', openInNewTab: false },
                description: 'Pucker-up classics.',
                items: [
                    {
                        id: 'ed-1-1',
                        link: { kind: 'external', label: 'Sour Skulls', url: '/sour-skulls', openInNewTab: false },
                    },
                    {
                        id: 'ed-1-2',
                        link: { kind: 'external', label: 'Watermelon', url: '/watermelon', openInNewTab: false },
                    },
                ],
            },
            {
                id: 'ed-2',
                link: { kind: 'external', label: 'Sweet', url: '/sweet', openInNewTab: false },
                description: 'Boats and jellies.',
                items: [
                    {
                        id: 'ed-2-1',
                        link: { kind: 'external', label: 'Strawberry', url: '/strawberry', openInNewTab: false },
                    },
                ],
            },
            {
                id: 'ed-3',
                link: { kind: 'external', label: 'Salty', url: '/salty', openInNewTab: false },
                description: 'Double salt, Turkish Pepper.',
                items: [
                    {
                        id: 'ed-3-1',
                        link: {
                            kind: 'external',
                            label: 'Turkish Pepper',
                            url: '/turkish-pepper',
                            openInNewTab: false,
                        },
                    },
                ],
            },
        ],
    },
    {
        id: 'top-compact',
        link: { kind: 'external', label: 'Compact', url: '/compact', openInNewTab: false },
        variant: 'compact-list',
        items: [
            { id: 'cl-1', link: { kind: 'external', label: 'About', url: '/about', openInNewTab: false } },
            { id: 'cl-2', link: { kind: 'external', label: 'Contact', url: '/contact', openInNewTab: false } },
        ],
    },
    {
        id: 'top-featured',
        link: { kind: 'external', label: 'Featured', url: '/featured', openInNewTab: false },
        variant: 'featured-promo',
        items: [
            {
                id: 'fp-hero',
                link: { kind: 'external', label: 'Summer Box', url: '/summer-box', openInNewTab: false },
                description: 'Curated picks for the season.',
            },
            { id: 'fp-1', link: { kind: 'external', label: 'See all', url: '/all', openInNewTab: false } },
        ],
    },
];
