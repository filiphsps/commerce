import { Suspense } from 'react';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { PageApi } from '@/api/page';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { Locale, useTranslation } from '@/utils/locale';
import { asText } from '@prismicio/client';
import { notFound } from 'next/navigation';

import { AcceptedPaymentMethods } from '@/components/informational/accepted-payment-methods';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
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
        const shop = await Shop.findByDomain(domain, { sensitiveData: true });

        const locale = Locale.from(localeData);
        const api = await ShopifyApolloApiClient({ shop, locale });

        const page = await PageApi({ shop, locale, handle: 'cart' });
        const locales = await LocalesApi({ api });

        const i18n = await getDictionary(locale);
        const { t } = useTranslation('common', i18n); // eslint-disable-line react-hooks/rules-of-hooks

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
                images: page?.meta_image
                    ? [
                          {
                              url: page.meta_image!.url as string,
                              width: page.meta_image!.dimensions?.width || 0,
                              height: page.meta_image!.dimensions?.height || 0,
                              alt: page.meta_image!.alt || '',
                              secureUrl: page.meta_image!.url as string
                          }
                      ]
                    : undefined
            }
        };
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        console.error(error);
        throw error;
    }
}

export default async function CartPage({ params: { domain, locale: localeData } }: { params: CartPageParams }) {
    try {
        const locale = Locale.from(localeData);

        const shop = await Shop.findByDomain(domain);
        const page = await PageApi({ shop, locale, handle: 'cart' });

        const i18n = await getDictionary(locale);
        const { t } = useTranslation('common', i18n);

        return (
            <>
                <Suspense fallback={<BreadcrumbsSkeleton />}>
                    <div className="-mb-[1.5rem] empty:hidden md:-mb-[2.25rem]">
                        <Breadcrumbs locale={locale} />
                    </div>
                </Suspense>

                <Suspense>
                    <CartContent
                        shop={shop}
                        locale={locale}
                        header={<Heading title={page?.title || t('cart')} subtitle={page?.description} />}
                        i18n={i18n}
                        paymentMethods={
                            <Suspense>
                                <AcceptedPaymentMethods shop={shop} locale={locale} />
                            </Suspense>
                        }
                    />
                </Suspense>
            </>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        console.error(error);
        throw error;
    }
}
