import 'server-only';

import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { components } from '@/slices';
import { getDictionary } from '@/utils/dictionary';

import type { Slices } from '@/components/cms/slice-zone';
import { SliceZone } from '@/components/cms/slice-zone';

import type { PageData, PageType } from '@/api/prismic/page';
import type { Locale } from '@/utils/locale';
import type { ReactNode } from 'react';

type PageParams<T extends PageType> = {
    shop: OnlineShop;
    locale: Locale;
    page?: PageData<T> | null;
    slices?: Slices | undefined;
    pageContent?: ReactNode;
    handle: string;
    type?: T;
};
async function PrismicPage<T extends PageType = 'custom_page'>({
    shop,
    locale,
    page = undefined,
    slices = undefined,
    pageContent = undefined,
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
        <Suspense
            fallback={<SliceZone.skeleton shop={shop} locale={locale} i18n={i18n} data={slices || page?.slices} />}
        >
            <SliceZone
                shop={shop}
                locale={locale}
                i18n={i18n}
                data={slices || page?.slices}
                components={components as any}
                context={{
                    shop: {
                        ...shop,
                        commerceProvider: {},
                        contentProvider: {}
                    },
                    i18n,
                    locale,
                    type,
                    pageContent
                }}
            />
        </Suspense>
    );
}
PrismicPage.displayName = 'Nordcom.PrismicPage';

export default PrismicPage;
