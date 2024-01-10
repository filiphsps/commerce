import 'server-only';

import type { PageData, PageType } from '@/api/page';
import type { Shop } from '@/api/shop';
import { components, components as slices } from '@/slices';
import type { Optional } from '@/utils/abstract-api';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { ErrorBoundary } from '@highlight-run/next/client';
import { SliceZone } from '@prismicio/react';
import { Suspense } from 'react';

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
        <ErrorBoundary showDialog={false}>
            <Suspense key={`${shop.id}.page.${handle}.PrismicPage`} fallback={<PrismicPage.skeleton page={page} />}>
                <SliceZone
                    slices={page?.slices || []}
                    components={slices}
                    context={{ shop, i18n, locale, type, uid: handle, handle }}
                />
            </Suspense>
        </ErrorBoundary>
    );
}

// TODO: Add a skeleton with a shimmer animation.
// TODO: Add {slice}.skeleton components as children.
PrismicPage.skeleton = <T extends PageType = 'custom_page'>({ page }: Optional<Pick<PageParams<T>, 'page'>> = {}) => {
    if (!page || !page.slices || page.slices.length <= 0) return <div />;

    return (
        <>
            {page.slices.map((slice) => {
                if (!slice) return null;

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

PrismicPage.displayName = 'Nordcom.PrismicPage';
export default PrismicPage;
