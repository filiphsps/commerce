import 'server-only';

import { Suspense } from 'react';

import type { OnlineShop, Optional } from '@nordcom/commerce-db';

import { components } from '@/slices';
import { getDictionary } from '@/utils/dictionary';
import { SliceZone } from '@prismicio/react';

import type { PageData, PageType } from '@/api/prismic/page';
import type { Locale } from '@/utils/locale';

type PageParams<T extends PageType> = {
    shop: OnlineShop;
    locale: Locale;
    page?: PageData<T> | null;
    slices?: any[];
    handle: string;
    type?: T;
};
async function PrismicPage<T extends PageType = 'custom_page'>({
    shop,
    locale,
    page = undefined,
    slices = undefined,
    handle,
    type = 'custom_page' as T
}: PageParams<T>) {
    if (typeof page === 'undefined' && typeof slices === 'undefined') {
        console.warn(`No page or slices provided for "${handle}"`);
    }

    if ((!page || page.slices.length <= 0) && (!slices || slices.length <= 0)) {
        return null;
    }

    const i18n = await getDictionary({ shop, locale });

    return (
        <Suspense fallback={<PrismicPage.skeleton page={page} slices={slices} shop={shop} />}>
            <SliceZone
                slices={page?.slices || slices || []}
                components={components}
                context={{
                    shop: {
                        ...shop,
                        commerceProvider: {},
                        contentProvider: {}
                    },
                    i18n,
                    locale,
                    type,
                    uid: handle,
                    handle
                }}
            />
        </Suspense>
    );
}
PrismicPage.displayName = 'Nordcom.PrismicPage';

// TODO: Add a skeleton with a shimmer animation.
// TODO: Add {slice}.skeleton components as children.
PrismicPage.skeleton = async <T extends PageType = 'custom_page'>({
    page,
    slices,
    shop
}: Optional<Pick<PageParams<T>, 'page' | 'slices' | 'shop'>> = {}) => {
    if ((!page || page.slices.length <= 0) && (!slices || slices.length <= 0)) {
        return null;
    }

    const items = (page?.slices as typeof slices) || slices || [];
    if (items.length <= 0) {
        return null;
    }

    return (
        <>
            {items.map((slice: Partial<(typeof items)[0]>) => {
                if (slice.slice_type === undefined) {
                    return null;
                }

                const Slice = components[slice.slice_type as keyof typeof components] as any;
                if (!Slice) {
                    return null;
                }

                if (Slice.skeleton) {
                    return <Slice.skeleton key={slice.id} slice={slice} data-skeleton />;
                }

                return (
                    <Slice
                        key={slice.id}
                        slice={slice}
                        context={{ shop: { ...shop, commerceProvider: {}, contentProvider: {} } }}
                    />
                );
            })}
        </>
    );
};
(PrismicPage.skeleton as any).displayName = 'Nordcom.PrismicPage.Skeleton';

export default PrismicPage;
