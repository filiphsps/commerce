import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { RedirectType, redirect } from 'next/navigation';
import { type ReactNode, Suspense } from 'react';
import { LocalesApi, Shop } from '@/api/_loaders';
import { ShopifyApolloApiClient } from '@/api/shopify';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import PageContent from '@/components/page-content';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { capitalize, getTranslations, Locale } from '@/utils/locale';
import ProductsContent from './products-content';

type SearchParams = Promise<{
    page?: string;
    vendor?: string;
    sorting?: string;
}>;

export type ProductsPageParams = Promise<{ domain: string; locale: string }>;

async function buildMetadata(domain: string, localeData: string, pageNumber: number): Promise<Metadata> {
    'use cache';
    cacheLife('days');

    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const api = await ShopifyApolloApiClient({ shop, locale });

    const [locales, i18n] = await Promise.all([LocalesApi({ api }), getDictionary(locale)]);
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

export async function generateMetadata({
    params,
    searchParams: queryParams,
}: {
    params: ProductsPageParams;
    searchParams: SearchParams;
}): Promise<Metadata> {
    const [{ domain, locale: localeData }, searchParams] = await Promise.all([params, queryParams]);
    const pageNumber = searchParams.page ? Number.parseInt(searchParams.page, 10) : 1;
    return buildMetadata(domain, localeData, pageNumber);
}

export default async function ProductsPage({
    params,
    searchParams,
}: {
    params: ProductsPageParams;
    searchParams: SearchParams;
}) {
    return (
        <ProductsShell params={params}>
            <ProductsDynamic params={params} searchParams={searchParams} />
        </ProductsShell>
    );
}

async function ProductsShell({ params, children }: { params: ProductsPageParams; children: ReactNode }) {
    'use cache';
    cacheLife('max');

    const { locale: localeData } = await params;
    const locale = Locale.from(localeData);
    const i18n = await getDictionary(locale);
    const { t } = getTranslations('common', i18n);

    return (
        <>
            <Suspense key="products.breadcrumbs" fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-5 empty:hidden md:-mb-9">
                    <Breadcrumbs locale={locale} title={t('products')} />
                </div>
            </Suspense>

            <PageContent>
                <Heading title={t('products')} titleClassName="capitalize" />
                {children}
            </PageContent>
        </>
    );
}

async function ProductsDynamic({
    params,
    searchParams: queryParams,
}: {
    params: ProductsPageParams;
    searchParams: SearchParams;
}) {
    const [{ domain, locale: localeData }, searchParams] = await Promise.all([params, queryParams]);
    const locale = Locale.from(localeData);

    if (searchParams.page === '1') {
        const urlParams = new URLSearchParams(searchParams);
        redirect(
            `/${locale.code}/products/${urlParams.size > 0 ? '?' : ''}${urlParams.toString()}`,
            RedirectType.replace,
        );
    }

    return <ProductsContent domain={domain} locale={locale} searchParams={searchParams} />;
}
