import type { AlertSlice } from '@/prismic/types';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export function alertFixture(overrides: DeepPartial<AlertSlice> = {}): AlertSlice {
    return {
        id: 'alert-fixture-id',
        slice_type: 'alert',
        slice_label: null,
        variation: 'default',
        primary: {
            severity: 'info',
            content: [{ type: 'paragraph', text: 'Test alert content', spans: [] }],
            show_icon: true,
        },
        items: [],
        ...overrides,
    } as unknown as AlertSlice;
}
