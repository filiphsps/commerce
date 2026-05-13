import { Shop } from '@nordcom/commerce-db';
import type { Metadata } from 'next';
import { RedirectType, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import PageContent from '@/components/page-content';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { readFlag } from '@/utils/flags-cache-safe';
import { capitalize, getTranslations, Locale } from '@/utils/locale';
import ProductsContent from './products-content';

type SearchParams = Promise<{
    page?: string;
}>;

export type ProductsPageParams = Promise<{ domain: string; locale: string }>;
export async function generateMetadata({
    params,
    searchParams: queryParams,
}: {
    params: ProductsPageParams;
    searchParams: SearchParams;
}): Promise<Metadata> {
    const searchParams = await queryParams;
    const pageNumber = searchParams.page ? Number.parseInt(searchParams.page, 10) : 1;

    const { domain, locale: localeData } = await params;
    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const api = await ShopifyApolloApiClient({ shop, locale });

    const locales = await LocalesApi({ api });

    const i18n = await getDictionary(locale);
    const { t } = getTranslations('common', i18n);

    const title =
        pageNumber > 1 ? `${t('products')} - ${t('page-n', pageNumber.toString())}` : capitalize(t('products'));
    return {
        title,
        alternates: {
            canonical: `https://${shop.domain}/${locale.code}/products/${pageNumber > 1 ? `?page=${pageNumber}` : ''}`,
            languages: Object.fromEntries(
                locales.map(({ code }) => [
                    code,
                    `https://${shop.domain}/${code}/products/${pageNumber > 1 ? `?page=${pageNumber}` : ''}`,
                ]),
            ),
        },
        openGraph: {
            url: `/products/`,
            type: 'website',
            title,
            siteName: shop.name,
            locale: locale.code,
        },
    };
}

export default async function ProductsPage({
    params,
    searchParams: queryParams,
}: {
    params: ProductsPageParams;
    searchParams: SearchParams;
}) {
    const { domain, locale: localeData } = await params;
    const locale = Locale.from(localeData);

    const productsPageEnabled = await readFlag('products-page', false);
    if (!productsPageEnabled) {
        redirect(`/${locale.code}/`, RedirectType.replace);
    }

    const searchParams = await queryParams;

    if (searchParams.page === '1') {
        const params = new URLSearchParams(searchParams);
        redirect(`/${locale.code}/products/${params.size > 0 ? '?' : ''}${params.toString()}`, RedirectType.replace);
    }

    const i18n = await getDictionary(locale);
    const { t } = getTranslations('common', i18n);

    return (
        <>
            <Suspense key={`products.breadcrumbs`} fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-[1.25rem] empty:hidden md:-mb-[2.25rem]">
                    <Breadcrumbs locale={locale} title={t('products')} />
                </div>
            </Suspense>

            <PageContent>
                <Heading title={t('products')} titleClassName="capitalize" />

                <ProductsContent domain={domain} locale={locale} searchParams={searchParams} />
            </PageContent>
        </>
    );
}
