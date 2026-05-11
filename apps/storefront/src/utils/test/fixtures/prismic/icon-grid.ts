import type { IconGridSlice } from '@/prismic/types';

export function iconGridFixture(overrides: Partial<IconGridSlice['primary']> = {}): IconGridSlice {
    return {
        id: 'icon-grid-fixture-id',
        slice_type: 'icon_grid',
        slice_label: null,
        variation: 'default',
        primary: {
            background: 'primary',
            ...overrides,
        },
        items: [
            {
                icon: {
                    url: 'https://images.prismic.io/test/icon.svg',
                    alt: 'Test icon',
                    copyright: null,
                    dimensions: { width: 32, height: 32 },
                },
                title: 'Free Shipping',
            },
            {
                icon: { url: null, alt: null, copyright: null, dimensions: null },
                title: 'No Icon Item',
            },
        ],
    } as unknown as IconGridSlice;
}
