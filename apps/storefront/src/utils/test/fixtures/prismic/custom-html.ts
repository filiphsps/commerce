import type { CustomHtmlSlice } from '@/prismic/types';

export function customHtmlFixture(overrides: Partial<CustomHtmlSlice['primary']> = {}): CustomHtmlSlice {
    return {
        id: 'custom-html-fixture-id',
        slice_type: 'custom_html',
        slice_label: null,
        variation: 'default',
        primary: {
            html: '<div class="custom">Custom HTML content</div>',
            ...overrides,
        },
        items: [],
    } as unknown as CustomHtmlSlice;
}
