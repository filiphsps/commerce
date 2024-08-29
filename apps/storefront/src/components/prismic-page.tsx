import 'server-only';

import { Suspense } from 'react';

import type { OnlineShop, Optional } from '@nordcom/commerce-db';

import { components } from '@/slices';
import { cn } from '@/utils/tailwind';
import { SliceZone } from '@prismicio/react';

import type { PageData, PageType } from '@/api/page';
import type { Locale, LocaleDictionary } from '@/utils/locale';

type PageParams<T extends PageType> = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    page?: PageData<T> | null;
    slices?: PageData<T>['slices'];
    handle: string;
    type?: T;
    className?: string;
};
function PrismicPage<T extends PageType = 'custom_page'>({
    shop,
    locale,
    i18n,
    page,
    slices,
    handle,
    type = 'custom_page' as T,
    className
}: PageParams<T>) {
    if (!page && !slices) {
        return null;
    }

    return (
        <section className={cn('flex flex-col gap-6 empty:hidden lg:gap-8', className)}>
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
        </section>
    );
}
PrismicPage.displayName = 'Nordcom.PrismicPage';

// TODO: Add a skeleton with a shimmer animation.
// TODO: Add {slice}.skeleton components as children.
PrismicPage.skeleton = <T extends PageType = 'custom_page'>({
    page,
    slices,
    shop
}: Optional<Pick<PageParams<T>, 'page' | 'slices' | 'shop'>> = {}) => {
    if (!page && !slices) return <div />;

    const items = page?.slices || slices || [];
    if (items.length <= 0) return <div />;

    return (
        <>
            {items.map((slice) => {
                if (!(slice as any)?.slice_type) return null;

                const Slice = components[slice.slice_type] as any;
                if (!Slice) return null;

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
