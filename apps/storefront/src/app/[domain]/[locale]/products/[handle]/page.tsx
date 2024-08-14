import 'server-only';

import { Suspense } from 'react';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { PageApi } from '@/api/page';
import { isProductVegan } from '@/api/product';
import { ShopifyApiClient, ShopifyApolloApiClient } from '@/api/shopify';
import { ProductApi } from '@/api/shopify/product';
import { LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import { isValidHandle } from '@/utils/handle';
import { Locale, useTranslation } from '@/utils/locale';
import { ProductToMerchantsCenterId } from '@/utils/merchants-center-id';
import { cn } from '@/utils/tailwind';
import { TitleToHandle } from '@/utils/title-to-handle';
import { asText } from '@prismicio/client';
import { parseGid } from '@shopify/hydrogen-react';
import { notFound } from 'next/navigation';

import Breadcrumbs from '@/components/informational/breadcrumbs';
import Link from '@/components/link';
import { AttributeIcon } from '@/components/products/attribute-icon';
import { InfoLines } from '@/components/products/info-lines';
import { ProductGallery } from '@/components/products/product-gallery';
import { RecommendedProducts } from '@/components/products/recommended-products';
import { Content } from '@/components/typography/content';

import { ProductContent, ProductPricing, ProductSavings } from './product-content';
import { ImportantProductDetails, ProductDetails } from './product-details';

import type { Metadata } from 'next';
import type { Product, WithContext } from 'schema-dts';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const dynamicParams = true;
export const revalidate = false;

export type ProductPageParams = { domain: string; locale: string; handle: string };

export async function generateStaticParams(
    {
        //params: { domain, locale: localeData }
    }: {
        params: Omit<ProductPageParams, 'handle'>;
    }
): Promise<Omit<ProductPageParams, 'domain' | 'locale'>[]> {
    /*const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain);
    const api = await ShopifyApiClient({ shop, locale });
    const { products } = await ProductsApi({ api });

    return products.map(({ node: { handle } }) => ({
        handle
    }));*/

    return [];
}

export async function generateMetadata({
    params: { domain, locale: localeData, handle }
}: {
    params: ProductPageParams;
}): Promise<Metadata> {
    try {
        if (!isValidHandle(handle)) notFound();
        const locale = Locale.from(localeData);

        // Fetch the current shop.
        const shop = await Shop.findByDomain(domain);

        // Setup the AbstractApi client.
        const api = await ShopifyApiClient({ shop, locale });

        // Do the actual API calls.
        const product = await ProductApi({ api, handle });
        const page = await PageApi({ shop, locale, handle, type: 'product_page' });
        const locales = await LocalesApi({ api });

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

const ROUNDED_BLOCK_STYLES =
    'flex h-auto w-full flex-col items-stretch justify-start gap-6 overflow-clip rounded-lg bg-gray-100 p-3 md:justify-stretch lg:gap-8 lg:p-5 empty:hidden';

export default async function ProductPage({
    params: { domain, locale: localeData, handle }
}: {
    params: ProductPageParams;
}) {
    try {
        if (!isValidHandle(handle)) notFound();

        // Creates a locale object from a locale code (e.g. `en-US`).
        const locale = Locale.from(localeData);

        // Fetch the current shop.
        const shop = await Shop.findByDomain(domain);
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

        const jsonLd: WithContext<Product> = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            'url': `https://${shop.domain}/${locale.code}/products/${handle}/`,
            'name': `${product.vendor} ${product.title}`,
            'brand': product.vendor,
            'image': initialVariant.image?.url || product.images.edges[0]?.node.url,
            'description': product.description || '',
            'offers': product.variants.edges.map(({ node: variant }) => ({
                '@type': 'Offer',
                'itemCondition': 'https://schema.org/NewCondition',
                'availability': variant.availableForSale ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
                'url': `https://${shop.domain}/${locale.code}/products/${product.handle}/?variant=${
                    parseGid(variant.id).id
                }`,

                'sku': ProductToMerchantsCenterId({
                    locale: locale,
                    product: {
                        productGid: product!.id,
                        variantGid: variant!.id
                    } as any
                }),
                'mpn': variant.barcode || variant.sku || undefined,

                'priceSpecification': {
                    '@type': 'PriceSpecification',
                    'price': Number.parseFloat(variant.price.amount),
                    'priceCurrency': variant.price.currencyCode
                },

                // TODO: Make all of the following configurable.
                'priceValidUntil': `${new Date().getFullYear() + 1}-12-31`,
                'hasMerchantReturnPolicy': {
                    '@type': 'MerchantReturnPolicy',
                    'applicableCountry': locale.country,
                    'returnPolicyCategory': 'https://schema.org/MerchantReturnNotPermitted'
                },
                'shippingDetails': {
                    '@type': 'OfferShippingDetails',
                    'shippingRate': {
                        '@type': 'MonetaryAmount',
                        'maxValue': 25,
                        'minValue': 0,
                        'currency': variant.price.currencyCode!
                    },
                    'shippingDestination': [
                        {
                            '@type': 'DefinedRegion',
                            'addressCountry': locale.country
                        }
                    ],
                    'deliveryTime': {
                        '@type': 'ShippingDeliveryTime',
                        'handlingTime': {
                            '@type': 'QuantitativeValue',
                            'minValue': 0,
                            'maxValue': 3,
                            'unitCode': 'DAY'
                        },
                        'transitTime': {
                            '@type': 'QuantitativeValue',
                            'minValue': 2,
                            'maxValue': 14,
                            'unitCode': 'DAY'
                        }
                    }
                }
            }))
        };

        let title = product.title.trim();
        if (title.endsWith(product.productType)) {
            title = title.slice(0, -product.productType.length).trim();
        }

        // If the product description contains a <h1> tag, replace our h1 with a div to avoid multiple h1s.
        let TitleTag: any = 'h1';
        if (content.length < 5 && content.includes('<h1')) {
            TitleTag = 'div';
        }

        return (
            <>
                <Breadcrumbs shop={shop} title={`${product.vendor} ${product.title}`} />

                <div className="flex flex-col gap-4 md:flex-row md:flex-nowrap">
                    <section className={'flex h-auto w-full md:w-1/2 md:shrink-0 lg:w-full lg:max-w-[52rem]'}>
                        <Suspense>
                            <ProductGallery
                                initialImageId={initialVariant.image?.id || product.images.edges[0]?.node.id}
                                images={product.images.edges.map((edge) => edge.node)}
                                className="h-full w-full"
                            />
                        </Suspense>
                    </section>

                    <Suspense fallback={<section className="flex p-4" data-skeleton />}>
                        <section className="flex flex-col gap-3">
                            <div>
                                <Suspense fallback={<div className="h-4 w-full" data-skeleton />}>
                                    <ProductSavings product={product} i18n={i18n} />
                                </Suspense>
                            </div>

                            <div className={cn(ROUNDED_BLOCK_STYLES)}>
                                <div className="flex h-auto w-full flex-col justify-start gap-3 lg:gap-4 lg:p-0">
                                    <header className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1 pb-2 empty:hidden">
                                            {isProductVegan(product) ? (
                                                <div
                                                    className="flex items-center justify-center gap-1 rounded-2xl bg-green-500 p-[0.4rem] px-3 text-xs font-semibold uppercase leading-none text-white"
                                                    title={t('this-product-is-vegan')}
                                                    data-nosnippet={true}
                                                >
                                                    <AttributeIcon data={'vegan'} className="text-lg" />
                                                    {t('vegan')}
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="flex w-full grow flex-wrap whitespace-pre-wrap text-3xl font-bold leading-none lg:leading-[1.1]">
                                            <TitleTag className="text-inherit">
                                                {title} <span data-nosnippet={true}>&ndash; {product.productType}</span>
                                            </TitleTag>
                                        </div>

                                        <Link
                                            className="hover:text-primary normal-case leading-[1.2] text-gray-600 transition-colors md:text-lg"
                                            href={`/collections/${TitleToHandle(product.vendor)}`}
                                            title={t('browse-all-products-by-brand', product.vendor)}
                                        >
                                            {t('by')} <span className="font-semibold">{product.vendor}</span>
                                        </Link>
                                    </header>

                                    <div className="flex items-end justify-start gap-2 md:gap-3">
                                        <Suspense>
                                            <ProductPricing product={product} />
                                        </Suspense>
                                    </div>
                                </div>

                                <Suspense>
                                    <ProductContent product={product} i18n={i18n} />
                                </Suspense>
                            </div>

                            <div className={cn(ROUNDED_BLOCK_STYLES)}>
                                <Suspense>
                                    <InfoLines product={product} i18n={i18n} locale={locale} />
                                </Suspense>
                            </div>

                            <Suspense>
                                <div className={cn(ROUNDED_BLOCK_STYLES)}>
                                    <Content
                                        dangerouslySetInnerHTML={{
                                            __html: content
                                        }}
                                    />

                                    <Suspense>
                                        <ImportantProductDetails locale={locale} data={product} />
                                    </Suspense>

                                    <Suspense>
                                        <div className="flex flex-wrap gap-3 border-0 border-t-2 border-solid border-gray-300 pt-4 md:gap-4">
                                            <ProductDetails locale={locale} data={product} />
                                        </div>
                                    </Suspense>
                                </div>
                            </Suspense>
                        </section>
                    </Suspense>
                </div>

                <section className="mt-2 flex flex-col gap-2 rounded-lg border-2 border-solid border-gray-100 py-4 md:py-5 lg:mt-6">
                    <p
                        className="block px-4 text-lg font-medium normal-case leading-none md:px-5 md:text-2xl"
                        data-nosnippet={true}
                    >
                        {t('you-may-also-like')}
                    </p>

                    <Suspense fallback={<RecommendedProducts.skeleton />}>
                        <RecommendedProducts shop={shop} locale={locale} product={product} className="px-4 md:px-5" />
                    </Suspense>
                </section>

                {/* Metadata */}
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            </>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}
