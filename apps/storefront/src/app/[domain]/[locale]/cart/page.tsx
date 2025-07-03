import { Fragment, Suspense } from 'react';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { PageApi } from '@/api/prismic/page';
import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { capitalize, getTranslations, Locale } from '@/utils/locale';
import { asText } from '@prismicio/client';

import { AcceptedPaymentMethods } from '@/components/informational/accepted-payment-methods';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import Heading from '@/components/typography/heading';

import CartContent from './cart-content';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export type CartPageParams = Promise<{ domain: string; locale: string }>;
export async function generateStaticParams(): Promise<Awaited<CartPageParams>[]> {
    /** @note Limit pre-rendering when not in production. */
    if (process.env.VERCEL_ENV !== 'production') {
        return [];
    }

    const shops = await Shop.findAll();
    return (
        await Promise.all(
            shops.map(async ({ domain }) => {
                try {
                    const shop = await findShopByDomainOverHttp(domain);
                    if (shop.domain.includes('demo')) {
                        return [];
                    }

                    return [
                        {
                            domain: shop.domain,
                            locale: Locale.from('en-US').code
                        }
                    ];
                } catch (error: unknown) {
                    if (!Error.isNotFound(error)) {
                        console.error(error);
                    }

                    return [];
                }
            })
        )
    )
        .flat(1)
        .filter(Boolean);
}

export async function generateMetadata({ params }: { params: CartPageParams }): Promise<Metadata> {
    const { domain, locale: localeData } = await params;
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });

    const locale = Locale.from(localeData);
    const api = await ShopifyApolloApiClient({ shop, locale });

    let page: Awaited<ReturnType<typeof PageApi<'cart_page'>>> | null = null;
    try {
        page = await PageApi({ shop, locale, handle: 'cart', type: 'cart_page' });
    } catch {}

    const locales = await LocalesApi({ api });

    const i18n = await getDictionary(locale);
    const { t } = getTranslations('common', i18n); // eslint-disable-line react-hooks/rules-of-hooks

    const title = page?.meta_title || capitalize(t('cart'));
    const description: string | undefined = asText(page?.meta_description) || undefined;
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
}

export default async function CartPage({ params }: { params: CartPageParams }) {
    const { domain, locale: localeData } = await params;
    const locale = Locale.from(localeData);
    const shop = await Shop.findByDomain(domain);

    const i18n = await getDictionary(locale);
    const { t } = getTranslations('common', i18n);

    return (
        <>
            <Suspense key={`pages.cart.breadcrumbs`} fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-[1.25rem] empty:hidden md:-mb-[2.25rem]">
                    <Breadcrumbs locale={locale} />
                </div>
            </Suspense>

            <Suspense>
                <CartContent
                    shop={shop}
                    locale={locale}
                    header={<Heading title={capitalize(t('cart'))} />}
                    i18n={i18n}
                    paymentMethods={
                        <Suspense fallback={<Fragment />}>
                            <AcceptedPaymentMethods shop={shop} locale={locale} />
                        </Suspense>
                    }
                />
            </Suspense>
        </>
    );
}
