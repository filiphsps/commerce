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
import { getTranslations, Locale } from '@/utils/locale';
import { productToMerchantsCenterId } from '@/utils/merchants-center-id';
import { safeParseFloat } from '@/utils/pricing';
import { checkAndHandleRedirect } from '@/utils/redirect';
import { cn } from '@/utils/tailwind';
import { AnalyticsEventTrigger } from '@/utils/trackable';
import { asText } from '@prismicio/client';
import { parseGid, parseMetafield } from '@shopify/hydrogen-react';
import { notFound, unstable_rethrow } from 'next/navigation';

import { CMSContent } from '@/components/cms/cms-content';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import { JsonLd } from '@/components/json-ld';
import { Card } from '@/components/layout/card';
import PageContent from '@/components/page-content';
import { AttributeIcon } from '@/components/products/attribute-icon';
import { InfoLines } from '@/components/products/info-lines';
import { ProductCategory } from '@/components/products/product-category';
import { ProductGallery } from '@/components/products/product-gallery';
import { ProductVendor } from '@/components/products/product-vendor';
import { RecommendedProducts } from '@/components/products/recommended-products';
import { Content } from '@/components/typography/content';

import { ProductContent, ProductPricing, ProductSavings } from './product-content';
import { ProductDetails, ProductOriginalName } from './product-details';

import type { Product } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';
import type { ParsedMetafields } from '@shopify/hydrogen-react';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import type { ProductGroup, WithContext } from 'schema-dts';

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

    let product: Awaited<ReturnType<typeof ProductApi>> | null = null;
    try {
        product = await ProductApi({ api, handle });
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            await checkAndHandleRedirect({ domain, locale: Locale.from(localeData), path: `/products/${handle}` });
            notFound();
        }

        console.error(error);
        unstable_rethrow(error);
        throw error;
    }

    const initialVariant = firstAvailableVariant(product);
    if (!initialVariant) {
        notFound();
    }

    let page: Awaited<ReturnType<typeof PageApi<'product_page'>>> | undefined = null;
    try {
        page = await PageApi({ shop, locale, handle, type: 'product_page' });
    } catch {}

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
                className="flex items-center justify-center gap-1 rounded-2xl bg-green-600 p-[0.4rem] px-3 text-xs font-semibold uppercase leading-none text-white"
                title={t('this-product-is-vegan')}
                data-nosnippet={true}
            >
                <AttributeIcon data={'vegan'} className="text-lg" />
                {t('vegan')}
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

    let product: Awaited<ReturnType<typeof ProductApi>> | null = null;
    try {
        product = await ProductApi({ api, handle });
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            await checkAndHandleRedirect({ domain, locale: Locale.from(localeData), path: `/products/${handle}` });
            notFound();
        }

        console.error(error);
        unstable_rethrow(error);
        throw error;
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

    const rating = product.rating ? parseMetafield<ParsedMetafields['rating']>(product.rating).parsedValue : null;
    const ratingCount =
        (product.ratingCount
            ? parseMetafield<ParsedMetafields['number_integer']>(product.ratingCount).parsedValue
            : null) || 0;

    const jsonLd: WithContext<ProductGroup> = {
        '@context': 'https://schema.org',
        '@type': 'ProductGroup',
        'name': product.title,
        'description': product.description || '',
        'url': `https://${shop.domain}/${locale.code}/products/${handle}/`,
        'brand': {
            '@type': 'Brand',
            'name': product.vendor
        },
        'productGroupID': productToMerchantsCenterId({ locale, product: { productGid: product.id } }),
        'sku': productToMerchantsCenterId({ locale, product: { productGid: product.id } }),
        'aggregateRating':
            ratingCount > 0
                ? {
                      '@type': 'AggregateRating',
                      'ratingValue': rating?.value,
                      'bestRating': rating?.scale_max || 5.0,
                      'worstRating': rating?.scale_min || 1.0,
                      'ratingCount': ratingCount
                  }
                : undefined,
        'variesBy': [
            //...(product.options.some(({ name }) => name.toLowerCase() === 'size') ? ['https://schema.org/size'] : []),
            //...(product.options.some(({ name }) => name.toLowerCase() === 'color') ? ['https://schema.org/color'] : [])
        ],
        'hasVariant': product.variants.edges.map(({ node: variant }) => ({
            '@type': 'Product',
            'name': `${product.title} ${variant.title}`,
            'category': product.productType || undefined,
            'description': product.description || '',
            'image': variant.image?.url || product.images.edges[0]?.node.url,

            'sku': productToMerchantsCenterId({
                locale: locale,
                product: {
                    productGid: product!.id,
                    variantGid: variant!.id
                } as any
            }),
            'mpn': variant.barcode || variant.sku || undefined,

            'weight': {
                '@type': 'QuantitativeValue',
                'unitText': variant.weightUnit,
                'value': safeParseFloat(undefined, variant.weight)
            },

            'offers': {
                '@type': 'Offer',
                'url': `https://${shop.domain}/${locale.code}/products/${product.handle}/${
                    variant.id !== initialVariant.id ? `?variant=${parseGid(variant.id).id}` : ''
                }`,
                'itemCondition': 'https://schema.org/NewCondition',
                'availability': variant.availableForSale ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
                'price': safeParseFloat(undefined, variant.price.amount),
                'priceCurrency': variant.price.currencyCode,
                'priceValidUntil': new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                })
            }
        }))
    };

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
            <Suspense key={`products.${handle}.analytics-event-trigger`} fallback={<Fragment />}>
                <AnalyticsEventTrigger
                    event="view_item"
                    data={{
                        gtm: {
                            ecommerce: {
                                currency: initialVariant.price.currencyCode,
                                value: safeParseFloat(undefined, initialVariant.price.amount),
                                items: [
                                    {
                                        item_id: productToMerchantsCenterId({
                                            locale,
                                            product: {
                                                productGid: product.id,
                                                variantGid: initialVariant.id
                                            }
                                        }),
                                        item_name: product.title,
                                        item_brand: product.vendor,
                                        item_category: product.productType || undefined,

                                        item_variant: initialVariant.title,
                                        product_id: product.id,
                                        variant_id: initialVariant.id,
                                        sku: initialVariant.sku || undefined,
                                        currency: initialVariant.price.currencyCode,
                                        price: safeParseFloat(undefined, initialVariant.price.amount!)
                                    }
                                ]
                            }
                        }
                    }}
                />
            </Suspense>

            <Suspense key={`products.${handle}.breadcrumbs`} fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-[1.25rem] empty:hidden md:-mb-[2.25rem]">
                    <Breadcrumbs locale={locale} title={`${product.vendor} ${product.title}`} />
                </div>
            </Suspense>

            <PageContent className="overflow flex max-w-full flex-col gap-4 px-0 md:flex-row md:flex-nowrap">
                <Suspense key={`products.${handle}.gallery`} fallback={<section className="w-full" />}>
                    <section className={'flex h-auto w-full grow flex-col gap-4'}>
                        <ProductGallery
                            initialImageId={initialVariant.image?.id || product.images.edges[0]?.node.id}
                            images={product.images.edges.map((edge) => edge.node)}
                            pageUrl={`https://${shop.domain}/${locale.code}/products/${handle}/`}
                            className="h-full w-full"
                            product={product}
                            i18n={i18n}
                        />
                    </section>
                </Suspense>

                <Suspense
                    key={`products.${handle}.details`}
                    fallback={<section className="w-full overflow-hidden md:max-w-[32rem]" />}
                >
                    <section className="flex w-full flex-col gap-2 overflow-hidden md:max-w-[32rem] 2xl:w-auto">
                        <Suspense
                            key={`products.${handle}.details.savings`}
                            fallback={<div className="h-24 w-full" data-skeleton />}
                        >
                            <ProductSavings product={product} i18n={i18n} />
                        </Suspense>

                        <Card className={cn(BLOCK_STYLES)}>
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
                                                title={t('browse-all-products-by-brand', product.vendor)}
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
                            <Card className={cn(BLOCK_STYLES)}>
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

                        <Card className={cn(BLOCK_STYLES, 'gap-3 lg:gap-3')}>
                            <Suspense
                                key={`products.${handle}.details.description`}
                                fallback={<div className="h-12 w-full" data-skeleton />}
                            >
                                <Content html={content} />
                            </Suspense>

                            <Suspense fallback={<Fragment />}>
                                <ProductOriginalName data={product} locale={locale} />
                            </Suspense>
                        </Card>

                        <Suspense fallback={<div className="h-12 w-full" data-skeleton />}>
                            <div
                                key={`products.${handle}.details.details`}
                                className="flex flex-wrap gap-2 empty:hidden"
                            >
                                <ProductDetails data={product} locale={locale} />
                            </div>
                        </Suspense>
                    </section>
                </Suspense>
            </PageContent>

            <Card className="mt-2 flex w-full flex-col gap-3 px-0 lg:mt-6" border={true}>
                <h2 className="block px-3 text-2xl font-medium leading-tight" data-nosnippet={true}>
                    {t('you-may-also-like')}
                </h2>

                <Suspense key={`products.${handle}.recommended-products`} fallback={<RecommendedProducts.skeleton />}>
                    <RecommendedProducts shop={shop} locale={locale} product={product} className="-my-2 w-full px-3" />
                </Suspense>
            </Card>

            {/* Metadata */}
            <JsonLd data={jsonLd} />
        </>
    );
}
