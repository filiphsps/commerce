import type { CollectionSlice } from '@/prismic/types';

export function collectionFixture(overrides: Partial<CollectionSlice['primary']> = {}): CollectionSlice {
    return {
        id: 'collection-fixture-id',
        slice_type: 'collection',
        slice_label: null,
        variation: 'default',
        primary: {
            handle: 'demo-collection',
            title: [{ type: 'paragraph', text: 'Demo Collection', spans: [] }],
            body: [],
            alignment: 'left',
            limit: 16,
            direction: 'horizontal',
            show_view_all_card: true,
            display: 'in-container',
            ...overrides,
        },
        items: [],
    } as unknown as CollectionSlice;
}
