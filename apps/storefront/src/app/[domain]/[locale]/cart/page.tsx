import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';
import { Error, NotFoundError, UnknownShopDomainError } from '@nordcom/commerce-errors';
import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound, unstable_rethrow } from 'next/navigation';
import { Fragment, Suspense } from 'react';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { AcceptedPaymentMethods } from '@/components/informational/accepted-payment-methods';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { capitalize, getTranslations, Locale } from '@/utils/locale';
import CartContent from './cart-content';

export type CartPageParams = Promise<{ domain: string; locale: string }>;
export async function generateMetadata({ params }: { params: CartPageParams }): Promise<Metadata> {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData } = await params;

    let shop: OnlineShop;
    try {
        shop = await Shop.findByDomain(domain, { sensitiveData: true });
    } catch (error: unknown) {
        if (Error.isNotFound(error) || error instanceof UnknownShopDomainError) {
            notFound();
        }

        console.error(error);
        unstable_rethrow(error);
        throw error;
    }

    const locale = Locale.from(localeData);
    const api = await ShopifyApolloApiClient({ shop, locale });

    const locales = await LocalesApi({ api });

    const i18n = await getDictionary(locale);
    const { t } = getTranslations('common', i18n);

    const title = capitalize(t('cart'));
    return {
        title,
        alternates: {
            canonical: `https://${shop.domain}/${locale.code}/cart/`,
            languages: Object.fromEntries(locales.map(({ code }) => [code, `https://${shop.domain}/${code}/cart/`])),
        },
        openGraph: {
            url: `/cart/`,
            type: 'website',
            title,
            siteName: shop.name,
            locale: locale.code,
        },
    };
}

export default async function CartPage({ params }: { params: CartPageParams }) {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData } = await params;
    const locale = Locale.from(localeData);

    let shop: OnlineShop;
    try {
        shop = await Shop.findByDomain(domain, { sensitiveData: true });
    } catch (error: unknown) {
        if (Error.isNotFound(error) || error instanceof UnknownShopDomainError) {
            notFound();
        }

        console.error(error);
        unstable_rethrow(error);
        throw error;
    }

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
