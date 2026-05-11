import type { CollapsibleTextSlice } from '@/prismic/types';

export function collapsibleTextFixture(overrides: Partial<CollapsibleTextSlice['primary']> = {}): CollapsibleTextSlice {
    return {
        id: 'collapsible-text-fixture-id',
        slice_type: 'collapsible_text',
        slice_label: null,
        variation: 'default',
        primary: {
            title: 'FAQ Question Title',
            text: [{ type: 'paragraph', text: 'FAQ answer text here.', spans: [] }],
            ...overrides,
        },
        items: [],
    } as unknown as CollapsibleTextSlice;
}
