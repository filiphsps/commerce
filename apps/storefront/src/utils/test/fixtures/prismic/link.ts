import type { LinkSlice } from '@/prismic/types';

export function linkFixture(overrides: Partial<LinkSlice['primary']> = {}): LinkSlice {
    return {
        id: 'link-fixture-id',
        slice_type: 'link',
        slice_label: null,
        variation: 'default',
        primary: {
            title: [{ type: 'paragraph', text: 'Nav Link', spans: [] }],
            href: { link_type: 'Web', url: '/collections/' },
            ...overrides,
        },
        items: [],
    } as unknown as LinkSlice;
}

export function linkHighlightedFixture(): LinkSlice {
    return {
        id: 'link-highlighted-fixture-id',
        slice_type: 'link',
        slice_label: null,
        variation: 'highlighted',
        primary: {
            title: [{ type: 'paragraph', text: 'Highlighted Nav Link', spans: [] }],
            href: { link_type: 'Web', url: '/sale/' },
        },
        items: [],
    } as unknown as LinkSlice;
}
