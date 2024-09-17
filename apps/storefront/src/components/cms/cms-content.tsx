import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { PageApi } from '@/api/page';

import PrismicPage from '@/components/cms/prismic-page';

import type { Locale } from '@/utils/locale';

export type CMSContentProps = {
    shop: OnlineShop;
    locale: Locale;
    handle: string;
    type?: string;
};

const Prismic = async ({ shop, locale, handle, type = 'custom_page' }: CMSContentProps) => {
    const page = await PageApi({ shop, locale, handle, type });

    return (
        <Suspense fallback={<PrismicPage.skeleton shop={shop} page={page as any} />}>
            <PrismicPage shop={shop} locale={locale} handle={handle} page={page} type={type as any} />
        </Suspense>
    );
};

export const CMSContent = async ({ shop, locale, handle, type }: CMSContentProps) => {
    switch (shop.contentProvider.type) {
        case 'prismic': {
            return (
                <Suspense fallback={<div className="h-36 w-full" data-skeleton />}>
                    <Prismic shop={shop} locale={locale} handle={handle} type={type} />
                </Suspense>
            );
        }
    }

    console.warn(`No CMS content provider found for "${shop.contentProvider.type}"`);
    return null;
};
