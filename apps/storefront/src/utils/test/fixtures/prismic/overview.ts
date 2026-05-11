import type { TextBlockSlice } from '@/prismic/types';

export function overviewFixture(): TextBlockSlice {
    return {
        id: 'overview-fixture-id',
        slice_type: 'text_block',
        slice_label: null,
        variation: 'default',
        primary: {},
        items: [
            {
                layout: 'left',
                accent: null,
                image: {
                    url: 'https://images.prismic.io/test/overview-image.jpg',
                    alt: 'Overview image',
                    copyright: null,
                    dimensions: { width: 800, height: 600 },
                },
                image_style: 'normal',
                text: [{ type: 'paragraph', text: 'Overview text content here.', spans: [] }],
            },
        ],
    } as unknown as TextBlockSlice;
}

export function overviewEmptyFixture(): TextBlockSlice {
    return {
        id: 'overview-empty-fixture-id',
        slice_type: 'text_block',
        slice_label: null,
        variation: 'default',
        primary: {},
        items: [],
    } as unknown as TextBlockSlice;
}
