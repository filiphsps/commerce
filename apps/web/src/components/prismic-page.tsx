'use client';

import type { CollectionPageDocumentData, CustomPageDocumentData, ProductPageDocumentData } from '@/prismic/types';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { SliceZone } from '@prismicio/react';

import type { StoreModel } from '@/models/StoreModel';
import { components as slices } from '@/slices';

type PageParams = {
    store: StoreModel;
    locale: Locale;
    prefetch: any;
    i18n: LocaleDictionary;
    // TODO: Type for this.
    page: CollectionPageDocumentData | ProductPageDocumentData | CustomPageDocumentData;
    handle: string;
    type: string;
};
export default function PrismicPage({ store, locale, prefetch, i18n, page, handle, type }: PageParams) {
    if (!page || (page.slices && page.slices.length <= 0)) return null;

    return (
        <SliceZone
            slices={page.slices}
            components={slices}
            context={{ store, prefetch, i18n, locale, type, uid: handle }}
        />
    );
}
