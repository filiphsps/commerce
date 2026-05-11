import type { OriginalContentSlice } from '@/prismic/types';

export function originalContentFixture(): OriginalContentSlice {
    return {
        id: 'original-content-fixture-id',
        slice_type: 'original_content',
        slice_label: null,
        variation: 'default',
        primary: {},
        items: [],
    } as unknown as OriginalContentSlice;
}
