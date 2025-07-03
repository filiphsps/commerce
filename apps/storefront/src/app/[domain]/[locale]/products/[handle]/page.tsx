import 'server-only';

import { Fragment, Suspense } from 'react';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { PageApi } from '@/api/prismic/page';
import { isProductVegan } from '@/api/product';
import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApiClient, ShopifyApolloApiClient } from '@/api/shopify';
import { ProductApi, ProductsApi } from '@/api/shopify/product';
import { LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import { isValidHandle } from '@/utils/handle';
import { capitalize, getTranslations, Locale } from '@/utils/locale';
import { checkAndHandleRedirect } from '@/utils/redirect';
import { cn } from '@/utils/tailwind';
import { asText } from '@prismicio/client';
import { parseGid } from '@shopify/hydrogen-react';
import { notFound, unstable_rethrow } from 'next/navigation';

import { CMSContent } from '@/components/cms/cms-content';
import { Card } from '@/components/layout/card';
import { AttributeIcon } from '@/components/products/attribute-icon';
import { InfoLines } from '@/components/products/info-lines';
import { ProductCategory } from '@/components/products/product-category';
import { ProductVendor } from '@/components/products/product-vendor';

import { ProductContent, ProductPricing, ProductSavings } from './product-content';

import type { Product } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const runtime = 'nodejs';
export const dynamic = 'auto';
export const dynamicParams = true;
export const revalidate = false;

export type ProductPageParams = Promise<{ domain: string; locale: string; handle: string }>;

export async function generateStaticParams({
    params
}: {
    params: Omit<ProductPageParams, 'handle'>;
}): Promise<Omit<Awaited<ProductPageParams>, 'domain' | 'locale'>[]> {
    /** @note Limit pre-rendering when not in production. */
    if (process.env.VERCEL_ENV !== 'production') {
        return [];
    }

    const { domain, locale: localeData } = await params;

    try {
        const locale = Locale.from(localeData);
        const shop = await findShopByDomainOverHttp(domain);
        const api = await ShopifyApiClient({ shop, locale });

        const { products } = await ProductsApi({ api, limit: 5 });

        return products.map(({ node: { handle } }) => ({ handle }));
    } catch (error: unknown) {
        unstable_rethrow(error);

        console.error(error);
        return [];
    }
}

type SearchParams = Promise<{
    variant?: string;
}>;

export async function generateMetadata({
    params,
    searchParams: queryParams
}: {
    params: ProductPageParams;
    searchParams: SearchParams;
}): Promise<Metadata> {
    const { domain, locale: localeData, handle } = await params;
    if (!isValidHandle(handle)) {
        notFound();
    }

    const locale = Locale.from(localeData);

    // Fetch the current shop.
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });

    // Setup the AbstractApi client.
    const api = await ShopifyApiClient({ shop, locale });

    const [product, productError] = await ProductApi({ api, handle });
    if (productError) {
        if (Error.isNotFound(productError)) {
            await checkAndHandleRedirect({ domain, locale: Locale.from(localeData), path: `/products/${handle}` });
            notFound();
        }

        console.error(productError);
        throw productError;
    }

    const initialVariant = firstAvailableVariant(product);
    if (!initialVariant) {
        notFound();
    }

    let page: Awaited<ReturnType<typeof PageApi<'product_page'>>> | undefined = null;
    try {
        page = await PageApi({ shop, locale, handle, type: 'product_page' });
    } catch (error: unknown) {
        unstable_rethrow(error);
    }

    const locales = await LocalesApi({ api });

    const searchParams = await queryParams;

    let search = '';
    if (searchParams.variant && searchParams.variant !== parseGid(initialVariant.id).id) {
        search = `?variant=${searchParams.variant}`;
    }

    const title = page?.meta_title || product.seo.title || `${product.vendor} ${product.title}`;
    page;
    const description =
        (page?.meta_description ? asText(page.meta_description) : undefined) ||
        product.seo.description ||
        product.description;
    return {
        title,
        description,
        alternates: {
            canonical: `https://${shop.domain}/${locale.code}/products/${handle}/${search}`,
            languages: locales.reduce(
                (prev, { code }) => ({
                    ...prev,
                    [code]: `https://${shop.domain}/${code}/products/${handle}/${search}`
                }),
                {}
            )
        },
        openGraph: {
            url: `/products/${handle}/`,
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

export const BLOCK_STYLES =
    'flex h-auto w-full flex-col items-stretch justify-start gap-8 overflow-clip rounded-lg md:justify-stretch lg:gap-8 empty:hidden';

async function Badges({ product, i18n }: { product: Product; i18n: LocaleDictionary }) {
    const badges: ReactNode[] = [];

    const { t } = getTranslations('product', i18n);

    if (isProductVegan(product)) {
        badges.push(
            <div
                key={'badge-attribute-vegan'}
                className="flex items-center justify-center gap-1 rounded-2xl bg-green-600 stroke-white p-[0.4rem] px-3 text-xs font-semibold uppercase leading-none text-white"
                title={t('this-product-is-vegan').toString()}
                data-nosnippet={true}
            >
                <AttributeIcon data={'vegan'} className="h-4" />
                {capitalize(t('vegan'))}
            </div>
        );
    }

    if (badges.length <= 0) {
        return null;
    }

    return <div className="flex items-center gap-1 empty:hidden">{badges}</div>;
}

export default async function ProductPage({ params }: { params: ProductPageParams }) {
    const { domain, locale: localeData, handle } = await params;
    if (!isValidHandle(handle)) {
        notFound();
    }

    // Creates a locale object from a locale code (e.g. `en-US`).
    const locale = Locale.from(localeData);

    // Fetch the current shop.
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });

    // Setup the AbstractApi client.
    const api = await ShopifyApolloApiClient({ shop, locale });

    const [product, productError] = await ProductApi({ api, handle });
    if (productError) {
        if (Error.isNotFound(productError)) {
            await checkAndHandleRedirect({ domain, locale: Locale.from(localeData), path: `/products/${handle}` });
            notFound();
        }

        console.error(productError);
        throw productError;
    }

    const { descriptionHtml: content } = product;

    // Get dictionary of strings for the current locale.
    const i18n = await getDictionary({ shop, locale });
    const { t } = getTranslations('product', i18n);

    const initialVariant = firstAvailableVariant(product);
    if (!initialVariant) {
        notFound();
    }

    // TODO: Create a proper `shopify-html-parser` to convert the HTML to React components.

    let title = product.title.trim();
    if (
        product.productType &&
        product.productType.length > 0 &&
        title.toLowerCase().endsWith(product.productType.toLowerCase())
    ) {
        title = title.slice(0, -product.productType.length).trim();
    }

    let productTypeElement = null;
    if (product.productType) {
        productTypeElement = (
            <span data-nosnippet={true} className="contents leading-none text-gray-700">
                {' '}
                &ndash; <ProductCategory shop={shop} locale={locale} product={product} />
            </span>
        );
    }

    // If the product description contains a <h1> tag, replace our h1 with a div to avoid multiple h1s.
    let TitleTag: any = 'h1';
    if (content.includes('<h1')) {
        TitleTag = 'div';
    }

    return (
        <>
            <Suspense
                key={`products.${handle}.details.savings`}
                fallback={<div className="h-24 w-full" data-skeleton />}
            >
                <ProductSavings product={product} i18n={i18n} />
            </Suspense>

            <Card className={BLOCK_STYLES}>
                <div className="flex h-auto w-full flex-col justify-start gap-3">
                    <Suspense
                        key={`products.${handle}.details.badges`}
                        fallback={<div className="h-4 w-full" data-skeleton />}
                    >
                        <Badges product={product} i18n={i18n} />
                    </Suspense>

                    <header className="flex flex-col gap-3">
                        <div className="flex grow flex-col gap-0">
                            <div className="flex w-full grow flex-wrap whitespace-pre-wrap text-3xl font-extrabold leading-tight">
                                <TitleTag className="text-inherit">
                                    {title}
                                    <Suspense>{productTypeElement}</Suspense>
                                </TitleTag>
                            </div>

                            <Suspense fallback={<div className="h-4 w-36" data-skeleton />}>
                                <ProductVendor
                                    shop={shop}
                                    locale={locale}
                                    product={product}
                                    className="font-semibold normal-case leading-tight text-gray-600 transition-colors md:text-lg"
                                    title={t('browse-all-products-by-brand', product.vendor).toString()}
                                    prefix={<span className="font-normal">{t('by')} </span>}
                                />
                            </Suspense>
                        </div>

                        <Suspense
                            key={`products.${handle}.details.pricing`}
                            fallback={<div className="h-4 w-24" data-skeleton />}
                        >
                            <div className="flex items-center justify-start gap-2 empty:hidden">
                                <ProductPricing product={product} />
                            </div>
                        </Suspense>
                    </header>
                </div>

                <Suspense
                    key={`products.${handle}.details.content`}
                    fallback={<div className="h-4 w-full" data-skeleton />}
                >
                    <ProductContent product={product} i18n={i18n} />
                </Suspense>
            </Card>

            <Suspense fallback={<Fragment />}>
                <Card className={BLOCK_STYLES}>
                    <InfoLines product={product} i18n={i18n} locale={locale} />
                </Card>
            </Suspense>

            <Suspense
                key={`products.${handle}.details.slices`}
                fallback={<Card className={cn(BLOCK_STYLES, 'h-32 rounded-lg')} data-skeleton />}
            >
                <section className="md:max-w-[32rem]">
                    <CMSContent shop={shop} locale={locale} handle={handle} type={'product_page'} />
                </section>
            </Suspense>
        </>
    );
}
