import 'server-only';

import { Suspense } from 'react';

import type { Optional, Shop } from '@nordcom/commerce-database';

import { components, components as slices } from '@/slices';
import { SliceZone } from '@prismicio/react';

import type { PageData, PageType } from '@/api/page';
import type { Locale, LocaleDictionary } from '@/utils/locale';

type PageParams<T extends PageType> = {
    shop: Shop;
    locale: Locale;
    i18n: LocaleDictionary;
    page: PageData<T>;
    handle: string;
    type?: T;
};
function PrismicPage<T extends PageType = 'custom_page'>({
    shop,
    locale,
    i18n,
    page,
    handle,
    type = 'custom_page' as T
}: PageParams<T>) {
    return (
        <Suspense fallback={<PrismicPage.skeleton page={page} />}>
            <SliceZone
                slices={page.slices || []}
                components={slices}
                context={{ shop, i18n, locale, type, uid: handle, handle }}
            />
        </Suspense>
    );
}
PrismicPage.displayName = 'Nordcom.PrismicPage';

// TODO: Add a skeleton with a shimmer animation.
// TODO: Add {slice}.skeleton components as children.
PrismicPage.skeleton = <T extends PageType = 'custom_page'>({ page }: Optional<Pick<PageParams<T>, 'page'>> = {}) => {
    if (!page || !page.slices || page.slices.length <= 0) return <div />;

    return (
        <>
            {page.slices.map((slice) => {
                if (!(slice as any)?.slice_type) return null;

                const Slice = components[slice.slice_type] as any;
                if (!Slice) return null;

                if (Slice.skeleton) {
                    return <Slice.skeleton key={slice.id} slice={slice} data-skeleton />;
                }

                return <div key={slice.id} data-slice={slice.id} />;
            })}
        </>
    );
};
(PrismicPage.skeleton as any).displayName = 'Nordcom.PrismicPage.Skeleton';

export default PrismicPage;
