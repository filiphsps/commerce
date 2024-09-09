import 'server-only';

import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { PageApi } from '@/api/page';
import { isProductVegan } from '@/api/product';
import { ShopifyApiClient, ShopifyApolloApiClient } from '@/api/shopify';
import { ProductApi, ProductsApi } from '@/api/shopify/product';
import { LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import { isValidHandle } from '@/utils/handle';
import { Locale, useTranslation } from '@/utils/locale';
import { ProductToMerchantsCenterId } from '@/utils/merchants-center-id';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';
import { TitleToHandle } from '@/utils/title-to-handle';
import { asText } from '@prismicio/client';
import { parseGid } from '@shopify/hydrogen-react';
import { notFound } from 'next/navigation';

import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import { JsonLd } from '@/components/json-ld';
import { Card } from '@/components/layout/card';
import Link from '@/components/link';
import PageContent from '@/components/page-content';
import PrismicPage from '@/components/prismic-page';
import { AttributeIcon } from '@/components/products/attribute-icon';
import { InfoLines } from '@/components/products/info-lines';
import { ProductGallery } from '@/components/products/product-gallery';
import { RecommendedProducts } from '@/components/products/recommended-products';
import { Content } from '@/components/typography/content';

import { ProductContent, ProductPricing, ProductSavings } from './product-content';
import { ProductDetails, ProductOriginalName } from './product-details';

import type { Product } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import type { ProductGroup, WithContext } from 'schema-dts';

export const runtime = 'nodejs';
export const dynamic = 'force-static'; // TODO: Figure out a better way to deal with query params.
export const dynamicParams = true;
export const revalidate = false;

export type ProductPageParams = { domain: string; locale: string; handle: string };

export async function generateStaticParams({
    params: { domain, locale: localeData }
}: {
    params: Omit<ProductPageParams, 'handle'>;
}): Promise<Omit<ProductPageParams, 'domain' | 'locale'>[]> {
    /** @note Limit pre-rendering when not in production. */
    if (process.env.VERCEL_ENV !== 'production') {
        return [];
    }

    try {
        const locale = Locale.from(localeData);

        const shop = await Shop.findByDomain(domain);
        const api = await ShopifyApiClient({ shop, locale });

        const limit = 10; // Artificially limit the number of products to avoid overloading the API.
        const { products } = await ProductsApi({ api, limit, sorting: 'BEST_SELLING' });

        return products.map(({ node: { handle } }) => ({
            handle
        }));
    } catch (error: unknown) {
        console.error(error);
        return [];
    }
}

export async function generateMetadata({
    params: { domain, locale: localeData, handle }
}: {
    params: ProductPageParams;
}): Promise<Metadata> {
    if (!isValidHandle(handle)) {
        notFound();
    }

    try {
        const locale = Locale.from(localeData);

        // Fetch the current shop.
        const shop = await Shop.findByDomain(domain, { sensitiveData: true });

        // Setup the AbstractApi client.
        const api = await ShopifyApiClient({ shop, locale });

        // Do the actual API calls.
        const [product, page, locales] = await Promise.all([
            ProductApi({ api, handle }),
            PageApi({ shop, locale, handle, type: 'product_page' }),
            LocalesApi({ api })
        ]);

        const title = page?.meta_title || product.seo.title || `${product.vendor} ${product.title}`;
        const description = asText(page?.meta_description) || product.seo.description || product.description;
        return {
            title,
            description,
            alternates: {
                canonical: `https://${shop.domain}/${locale.code}/products/${handle}/`,
                languages: locales.reduce(
                    (prev, { code }) => ({
                        ...prev,
                        [code]: `https://${shop.domain}/${code}/products/${handle}/`
                    }),
                    {}
                )
            },
            openGraph: {
                url: `/products/${handle}/`,
                type: 'website',
                title,
                description,
                siteName: shop.name,
                locale: locale.code,
                images: [
                    ...(page?.meta_image.dimensions
                        ? [
                              {
                                  url: page.meta_image.url!,
                                  width: page.meta_image.dimensions.width!,
                                  height: page.meta_image.dimensions.height!
                              }
                          ]
                        : []),
                    ...product.images.edges.map(({ node }) => ({
                        url: node.url,
                        width: node.width!,
                        height: node.height!
                    }))
                ]
            }
        };
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}

const BLOCK_STYLES =
    'flex h-auto w-full flex-col items-stretch justify-start gap-8 overflow-clip rounded-lg md:justify-stretch lg:gap-8 empty:hidden';

async function ProductPageSlices({
    shop,
    locale,
    handle
}: {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    handle: string;
}) {
    const page = await PageApi({ shop, locale, handle, type: 'product_page' });

    return (
        <section className="empty:hidden">
            {(page?.slices || []).length > 0 ? (
                <PrismicPage shop={shop} locale={locale} page={page} handle={handle} type={'product_page'} />
            ) : null}
        </section>
    );
}

async function Badges({ product, i18n }: { product: Product; i18n: LocaleDictionary }) {
    const badges: ReactNode[] = [];

    const { t } = useTranslation('product', i18n);

    if (isProductVegan(product)) {
        badges.push(
            <div
                key={'badge-attribute-vegan'}
                className="flex items-center justify-center gap-1 rounded-2xl bg-green-500 p-[0.4rem] px-3 text-xs font-semibold uppercase leading-none text-white"
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

export default async function ProductPage({
    params: { domain, locale: localeData, handle }
}: {
    params: ProductPageParams;
}) {
    if (!isValidHandle(handle)) {
        notFound();
    }

    try {
        // Creates a locale object from a locale code (e.g. `en-US`).
        const locale = Locale.from(localeData);

        // Fetch the current shop.
        const shop = await Shop.findByDomain(domain, { sensitiveData: true });

        // Setup the AbstractApi client.
        const api = await ShopifyApolloApiClient({ shop, locale });

        // Do the actual API calls.
        const product = await ProductApi({ api, handle });

        // Get dictionary of strings for the current locale.
        const i18n = await getDictionary({ shop, locale });
        const { t } = useTranslation('product', i18n);

        const initialVariant = FirstAvailableVariant(product);
        if (!initialVariant) notFound();

        // TODO: Create a proper `shopify-html-parser` to convert the HTML to React components.
        const content = product.descriptionHtml || '';

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
            'productGroupID': parseGid(product.id).resourceId!,
            'variesBy': [], // TODO: Support this.
            'hasVariant': product.variants.edges.map(({ node: variant }) => ({
                '@type': 'Product',
                'name': `${product.title} ${variant.title}`,
                'description': product.description || '',
                'image': variant.image?.url || product.images.edges[0]?.node.url,

                'sku': ProductToMerchantsCenterId({
                    locale: locale,
                    product: {
                        productGid: product!.id,
                        variantGid: variant!.id
                    } as any
                }),
                'mpn': variant.barcode || variant.sku || undefined,

                'offers': {
                    '@type': 'Offer',
                    'url': `https://${shop.domain}/${locale.code}/products/${product.handle}/?variant=${
                        parseGid(variant.id).id
                    }`,
                    'itemCondition': 'https://schema.org/NewCondition',
                    'availability': variant.availableForSale
                        ? 'https://schema.org/InStock'
                        : 'https://schema.org/SoldOut',

                    'price': safeParseFloat(undefined, variant.price.amount),
                    'priceCurrency': variant.price.currencyCode,
                    'priceSpecification': {
                        '@type': 'PriceSpecification',
                        'price': safeParseFloat(undefined, variant.price.amount),
                        'priceCurrency': variant.price.currencyCode
                    }
                }
            }))
        };

        let title = product.title.trim();
        if (product.productType.length > 0 && title.endsWith(product.productType)) {
            title = title.slice(0, -product.productType.length).trim();
        }

        // If the product description contains a <h1> tag, replace our h1 with a div to avoid multiple h1s.
        let TitleTag: any = 'h1';
        if (content.includes('<h1')) {
            TitleTag = 'div';
        }

        return (
            <>
                <Suspense fallback={<BreadcrumbsSkeleton />}>
                    <div className="-mb-[1.5rem] empty:hidden md:-mb-[2.25rem]">
                        <Breadcrumbs locale={locale} title={`${product.vendor} ${product.title}`} />
                    </div>
                </Suspense>

                <PageContent className="overflow flex max-w-full flex-col gap-4 px-0 md:flex-row md:flex-nowrap">
                    <Suspense fallback={<section className="w-full" />}>
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

                    <Suspense fallback={<section className="w-full xl:max-w-[38rem]" />}>
                        <section className="flex w-full flex-col gap-3 xl:max-w-[38rem]">
                            <Suspense fallback={<div className="h-4 w-full" data-skeleton />}>
                                <ProductSavings product={product} i18n={i18n} />
                            </Suspense>

                            <Card className={cn(BLOCK_STYLES)}>
                                <div className="flex h-auto w-full flex-col justify-start gap-3 lg:gap-4 lg:p-0">
                                    <Suspense fallback={<div className="h-4 w-full" data-skeleton />}>
                                        <Badges product={product} i18n={i18n} />
                                    </Suspense>

                                    <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-1">
                                        <div className="flex grow flex-col gap-0">
                                            <div className="flex w-full grow flex-wrap whitespace-pre-wrap text-3xl font-extrabold leading-tight">
                                                <TitleTag className="text-inherit">
                                                    {title}{' '}
                                                    {product.productType ? (
                                                        <span data-nosnippet={true}>&ndash; {product.productType}</span>
                                                    ) : null}
                                                </TitleTag>
                                            </div>

                                            <Link
                                                className="hover:text-primary normal-case leading-tight text-gray-600 transition-colors md:text-lg"
                                                href={`/collections/${TitleToHandle(product.vendor)}`}
                                                title={t('browse-all-products-by-brand', product.vendor)}
                                            >
                                                {t('by')} <span className="font-semibold">{product.vendor}</span>
                                            </Link>
                                        </div>

                                        <Suspense>
                                            <div className="flex items-end justify-start gap-2 empty:hidden md:gap-3">
                                                <ProductPricing product={product} />
                                            </div>
                                        </Suspense>
                                    </header>
                                </div>

                                <Suspense>
                                    <ProductContent product={product} i18n={i18n} />
                                </Suspense>
                            </Card>

                            <Suspense>
                                <Card className={cn(BLOCK_STYLES)}>
                                    <InfoLines product={product} i18n={i18n} locale={locale} />
                                </Card>
                            </Suspense>

                            <Suspense fallback={<Card className={cn(BLOCK_STYLES, 'h-32')} data-skeleton />}>
                                <ProductPageSlices shop={shop} locale={locale} i18n={i18n} handle={handle} />
                            </Suspense>

                            <Card className={cn(BLOCK_STYLES, 'gap-0 lg:gap-0')}>
                                <Suspense fallback={<div className="h-12 w-full" data-skeleton />}>
                                    <Content html={content} />
                                </Suspense>

                                <Suspense>
                                    <ProductOriginalName data={product} locale={locale} />
                                </Suspense>
                            </Card>

                            <Suspense fallback={<div className="h-12 w-full" data-skeleton />}>
                                <div className="flex flex-wrap gap-2 empty:hidden">
                                    <ProductDetails data={product} locale={locale} />
                                </div>
                            </Suspense>
                        </section>
                    </Suspense>
                </PageContent>

                <Card className="mt-2 flex w-full flex-col gap-3 px-0 lg:mt-6" border={true}>
                    <p className="block px-3 text-xl font-extrabold leading-tight" data-nosnippet={true}>
                        {t('you-may-also-like')}
                    </p>

                    <Suspense fallback={<RecommendedProducts.skeleton />}>
                        <RecommendedProducts
                            shop={shop}
                            locale={locale}
                            product={product}
                            className="-my-2 w-full px-3"
                        />
                    </Suspense>
                </Card>

                {/* Metadata */}
                <JsonLd data={jsonLd} />
            </>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}
