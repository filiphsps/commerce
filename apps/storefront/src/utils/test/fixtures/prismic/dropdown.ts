import type { DropdownSlice } from '@/prismic/types';

export function dropdownFixture(overrides: Partial<DropdownSlice['primary']> = {}): DropdownSlice {
    return {
        id: 'dropdown-fixture-id',
        slice_type: 'dropdown',
        slice_label: null,
        variation: 'default',
        primary: {
            title: [{ type: 'paragraph', text: 'Dropdown Title', spans: [] }],
            links: [],
            ...overrides,
        },
        items: [],
    } as unknown as DropdownSlice;
}

export function dropdownWithLinksFixture(): DropdownSlice {
    return {
        id: 'dropdown-links-fixture-id',
        slice_type: 'dropdown',
        slice_label: null,
        variation: 'default',
        primary: {
            title: [{ type: 'paragraph', text: 'Dropdown With Links', spans: [] }],
            links: [
                {
                    title: [{ type: 'paragraph', text: 'Link Item', spans: [] }],
                    href: { link_type: 'Web', url: 'https://example.com' },
                    image: { url: null, alt: null, copyright: null, dimensions: null },
                    background_color: null,
                    image_position: 'center',
                    description: [],
                    shadow: true,
                },
            ],
        },
        items: [],
    } as unknown as DropdownSlice;
}
