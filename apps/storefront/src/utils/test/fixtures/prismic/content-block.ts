import type { ContentBlockSlice } from '@/prismic/types';

export function contentBlockFixture(overrides: Partial<ContentBlockSlice['primary']> = {}): ContentBlockSlice {
    return {
        id: 'content-block-fixture-id',
        slice_type: 'content_block',
        slice_label: null,
        variation: 'default',
        primary: {
            text: [{ type: 'paragraph', text: 'Content block text here.', spans: [] }],
            width: false,
            ...overrides,
        },
        items: [],
    } as unknown as ContentBlockSlice;
}

export function contentBlockCardFixture(): ContentBlockSlice {
    return {
        id: 'content-block-card-fixture-id',
        slice_type: 'content_block',
        slice_label: null,
        variation: 'card',
        primary: {
            text: [{ type: 'paragraph', text: 'Card content block text.', spans: [] }],
            border: true,
            width: false,
        },
        items: [],
    } as unknown as ContentBlockSlice;
}
