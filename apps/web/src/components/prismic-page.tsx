import 'server-only';

import type { PageData, PageType } from '@/api/page';
import type { Shop } from '@/api/shop';
import type { StoreModel } from '@/models/StoreModel';
import { components, components as slices } from '@/slices';
import type { Optional } from '@/utils/abstract-api';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { PrefetchData } from '@/utils/prefetch';
import { SliceZone } from '@prismicio/react';
import { Suspense } from 'react';

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
    prefetch?: PrefetchData;
};
function PrismicPage<T extends PageType = 'custom_page'>({
    shop,
    store,
    locale,
    prefetch,
    i18n,
    page,
    handle,
    type = 'custom_page' as T
}: PageParams<T>) {
    return (
        <Suspense fallback={<PrismicPage.skeleton page={page || undefined} />}>
            <SliceZone
                slices={page?.slices || []}
                components={slices}
                context={{ shop, store, prefetch, i18n, locale, type, uid: handle, handle }}
            />
        </Suspense>
    );
}

// TODO: Add a skeleton with a shimmer animation.
// TODO: Add {slice}.skeleton components as children.
PrismicPage.skeleton = <T extends PageType = 'custom_page'>({ page }: Optional<Pick<PageParams<T>, 'page'>> = {}) => {
    if (!page || !page.slices || page.slices.length <= 0) return <div />;

    return (
        <div>
            {page.slices.map((slice) => {
                if (!slice) return null;

                const Slice = components[slice.slice_type] as any;
                if (!Slice) return null;

                if (Slice.skeleton) {
                    return <Slice.skeleton key={slice.id} slice={slice} />;
                }

                return <div key={slice.id} data-slice={slice.id} />;
            })}
        </div>
    );
};

PrismicPage.displayName = 'Nordcom.PrismicPage';
export default PrismicPage;
