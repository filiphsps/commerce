import type { ColumnsSlice } from '@/prismic/types';

export function columnsFixture(overrides: Partial<ColumnsSlice['primary']> = {}): ColumnsSlice {
    return {
        id: 'columns-fixture-id',
        slice_type: 'columns',
        slice_label: null,
        variation: 'default',
        primary: {
            children: [],
            ...overrides,
        },
        items: [],
    } as unknown as ColumnsSlice;
}
