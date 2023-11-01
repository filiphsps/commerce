'use client';

import { PageApi } from '@/api/page';
import type { StoreModel } from '@/models/StoreModel';
import type { CollectionPageDocumentData, CustomPageDocumentData, ProductPageDocumentData } from '@/prismic/types';
import { components as slices } from '@/slices';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { SliceZone, usePrismicClient } from '@prismicio/react';
import { useMemo } from 'react';
import useSWR from 'swr';

type PageParams = {
    store: StoreModel;
    locale: Locale;
    prefetch: any;
    i18n: LocaleDictionary;
    // TODO: Type for this
    page: CollectionPageDocumentData | ProductPageDocumentData | CustomPageDocumentData;
    handle: string;
    type: string;
};
export default function PrismicPage({ store, locale, prefetch, i18n, page: pageData, handle, type }: PageParams) {
    const {
        data: { page }
    } = useSWR(
        [
            'PageApi',
            {
                locale,
                type: type as any,
                handle,
                client: usePrismicClient()
            }
        ],
        ([, props]) => PageApi(props),
        {
            fallbackData: { page: pageData }
        }
    );

    if (!page) return null;

    const children = useMemo(
        () => <SliceZone slices={page.slices} components={slices} context={{ store, prefetch, i18n, locale }} />,
        [handle]
    );
    return children;
}
