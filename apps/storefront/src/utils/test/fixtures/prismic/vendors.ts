import type { VendorsSlice } from '@/prismic/types';

export function vendorsFixture(): VendorsSlice {
    return {
        id: 'vendors-fixture-id',
        slice_type: 'vendors',
        slice_label: null,
        variation: 'default',
        primary: {},
        items: [],
    } as unknown as VendorsSlice;
}
