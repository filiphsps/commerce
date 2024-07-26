/* eslint-disable react-hooks/rules-of-hooks */

import { unstable_cache as cache } from 'next/cache';
import { notFound } from 'next/navigation';

import { ShopApi } from '@nordcom/commerce-database';
import { Error } from '@nordcom/commerce-errors';

import { PageApi } from '@/api/page';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { LocalesApi, StoreApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { Locale, useTranslation } from '@/utils/locale';
import { asText } from '@prismicio/client';

import Heading from '@/components/typography/heading';

import CartContent from './cart-content';

import type { Metadata } from 'next';

export type CartPageParams = { domain: string; locale: string };
export async function generateMetadata({
    params: { domain, locale: localeData }
}: {
    params: CartPageParams;
}): Promise<Metadata> {
    try {
        const locale = Locale.from(localeData);

        const shop = await ShopApi(domain, cache);
        const api = await ShopifyApolloApiClient({ shop, locale });

        const page = await PageApi({ shop, locale, handle: 'cart', type: 'custom_page' } as any);
        const locales = await LocalesApi({ api });

        const i18n = await getDictionary(locale);
        const { t } = useTranslation('common', i18n);

        const title = page?.meta_title || page?.title || t('cart');
        const description: string | undefined = asText(page?.meta_description) || page?.description || undefined;
        return {
            title,
            description,
            alternates: {
                canonical: `https://${shop.domain}/${locale.code}/cart/`,
                languages: locales.reduce(
                    (prev, { code }) => ({
                        ...prev,
                        [code]: `https://${shop.domain}/${code}/cart/`
                    }),
                    {}
                )
            },
            openGraph: {
                url: `/cart/`,
                type: 'website',
                title,
                description,
                siteName: shop.name,
                locale: locale.code,
                images:
                    (page?.meta_image && [
                        {
                            url: page.meta_image!.url as string,
                            width: page.meta_image!.dimensions?.width || 0,
                            height: page.meta_image!.dimensions?.height || 0,
                            alt: page.meta_image!.alt || '',
                            secureUrl: page.meta_image!.url as string
                        }
                    ]) ||
                    undefined
            }
        };
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}

export default async function CartPage({ params: { domain, locale: localeData } }: { params: CartPageParams }) {
    try {
        const locale = Locale.from(localeData);

        const shop = await ShopApi(domain, cache);
        const api = await ShopifyApolloApiClient({ shop, locale });
        const page = await PageApi({ shop, locale, handle: 'cart' });
        const store = await StoreApi({ locale, api });

        const i18n = await getDictionary(locale);
        const { t } = useTranslation('common', i18n);

        return (
            <CartContent
                shop={shop}
                locale={locale}
                header={<Heading title={page?.title || t('cart')} subtitle={page?.description} />}
                i18n={i18n}
                store={store}
            />
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}
