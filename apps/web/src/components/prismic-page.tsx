import type { Locale, LocaleDictionary } from '@/utils/locale';
import { SliceZone } from '@prismicio/react';

import type { PageData, PageType } from '@/api/page';
import type { Shop } from '@/api/shop';
import type { StoreModel } from '@/models/StoreModel';
import { components as slices } from '@/slices';
import type { PrefetchData } from '@/utils/prefetch';

type PageParams<T extends PageType> = {
    shop: Shop;
    store: StoreModel;
    locale: Locale;
    i18n: LocaleDictionary;
    page: PageData<T>;
    handle: string;
    type?: T;

    /**
     * @deprecated Migrate to the preloading pattern ({@link https://nextjs.org/docs/app/building-your-application/data-fetching/patterns#preloading-data}).
     */
    prefetch: PrefetchData;
};
export default function PrismicPage<T extends PageType = 'custom_page'>({
    shop,
    store,
    locale,
    prefetch,
    i18n,
    page,
    handle,
    type = 'custom_page' as T
}: PageParams<T>) {
    if (!page || (page.slices && page.slices.length <= 0)) return null;

    return (
        <SliceZone
            slices={page.slices}
            components={slices}
            context={{ shop, store, prefetch, i18n, locale, type, uid: handle }}
        />
    );
}
