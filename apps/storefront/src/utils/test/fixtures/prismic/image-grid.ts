import type { ImageGridSlice } from '@/prismic/types';

export function imageGridFixture(): ImageGridSlice {
    return {
        id: 'image-grid-fixture-id',
        slice_type: 'image_grid',
        slice_label: null,
        variation: 'default',
        primary: {},
        items: [
            {
                image: {
                    url: 'https://images.prismic.io/test/grid-image.jpg',
                    alt: 'Grid image',
                    copyright: null,
                    dimensions: { width: 800, height: 600 },
                },
                href: { link_type: 'Web', url: 'https://example.com' },
                title: [{ type: 'paragraph', text: 'Grid Item Title', spans: [] }],
                description: [],
            },
        ],
    } as unknown as ImageGridSlice;
}

export function imageGridEmptyFixture(): ImageGridSlice {
    return {
        id: 'image-grid-empty-fixture-id',
        slice_type: 'image_grid',
        slice_label: null,
        variation: 'default',
        primary: {},
        items: [],
    } as unknown as ImageGridSlice;
}
