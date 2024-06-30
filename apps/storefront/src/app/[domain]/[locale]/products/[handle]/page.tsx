import 'server-only';

import { Suspense } from 'react';
import { unstable_cache as cache } from 'next/cache';
import { notFound } from 'next/navigation';

import { ShopApi } from '@nordcom/commerce-database';
import { Error } from '@nordcom/commerce-errors';

import { PageApi } from '@/api/page';
import { ShopifyApiClient, ShopifyApolloApiClient } from '@/api/shopify';
import { ProductApi } from '@/api/shopify/product';
import { LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import { isValidHandle } from '@/utils/handle';
import { Locale, useTranslation } from '@/utils/locale';
import { ProductToMerchantsCenterId } from '@/utils/merchants-center-id';
import { TitleToHandle } from '@/utils/title-to-handle';
import { asText } from '@prismicio/client';
import { parseGid } from '@shopify/hydrogen-react';

import Breadcrumbs from '@/components/informational/breadcrumbs';
import Link from '@/components/link';
import { InfoLines } from '@/components/products/info-lines';
import { ProductGallery } from '@/components/products/product-gallery';
import { RecommendedProducts } from '@/components/products/recommended-products';
import { Content } from '@/components/typography/content';

import { ProductContent, ProductContentSkeleton, ProductPricing, ProductPricingSkeleton } from './product-content';
import { ImportantProductDetails, ProductDetails } from './product-details';

import type { Metadata } from 'next';
import type { Product, WithContext } from 'schema-dts';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const dynamicParams = true;
export const revalidate = false;

export type ProductPageParams = { domain: string; locale: string; handle: string };

export async function generateStaticParams({
    params //: { domain, locale: localeData }
}: {
    params: Omit<ProductPageParams, 'handle'>;
}): Promise<Omit<ProductPageParams, 'domain' | 'locale'>[]> {
    /*const locale = Locale.from(localeData);

    const shop = await ShopApi(domain, cache, true);
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
        const shop = await ShopApi(domain, cache, true);

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
        const shop = await ShopApi(domain, cache);
        // Setup the AbstractApi client.
        const api = await ShopifyApolloApiClient({ shop, locale });

        // Do the actual API calls.
        const product = await ProductApi({ api, handle });

        // Get dictionary of strings for the current locale.
        const i18n = await getDictionary({ shop, locale });
        const { t } = useTranslation('product', i18n);

        // TODO: Create a proper `shopify-html-parser` to convert the HTML to React components.
        // This function is used to deal with the title in the product's description
        // and to make sure it's the correct h tag.
        const todoImproperWayToHandleDescriptionFix = (description?: string): string | null => {
            if (!description) return null;
            let result = description;

            const titleTags = new RegExp('(?<=<h1>)(.+?)(?=</h1>)').exec(description)?.[0];

            if (titleTags) {
                const title = titleTags.replaceAll(/<[^>]*>/g, '');

                result = result.replace(`<h1>${titleTags}</h1>\n`, '');
                // Replace h1 with h2
                result = `<h2>${title}</h2>\n${result}`;
            }

            return result;
        };

        const initialVariant = FirstAvailableVariant(product);
        if (!initialVariant) notFound();

        const content = todoImproperWayToHandleDescriptionFix(product.descriptionHtml) || '';

        const jsonLd: WithContext<Product> = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            'url': `https://${shop.domain}/${locale.code}/products/${handle}/`,
            'name': `${product.vendor} ${product.title}`,
            'brand': product.vendor,
            'image': initialVariant.image?.url,
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

        return (
            <>
                <section className="flex flex-col gap-4 md:flex-row md:flex-nowrap md:gap-8">
                    <div className={'flex h-auto w-full md:w-1/2 md:shrink-0 lg:w-full lg:max-w-3xl'}>
                        <ProductGallery
                            initialImageId={initialVariant.image?.id || product.images.edges[0]?.node.id}
                            images={product.images.edges.map((edge) => edge.node)}
                            className="h-full w-full"
                        />
                    </div>

                    <div className="flex h-auto w-full flex-col items-stretch justify-start gap-6 md:justify-stretch md:gap-8">
                        <div className="flex h-auto w-full flex-col justify-start gap-2">
                            <header className="flex flex-col">
                                <div className="text-3xl font-bold leading-tight">
                                    <h1 className="text-inherit">
                                        {product.title} &mdash; {product.productType}
                                    </h1>
                                </div>

                                <Link
                                    className="hover:text-primary text-lg normal-case text-gray-600 transition-colors"
                                    href={`/collections/${TitleToHandle(product.vendor)}`}
                                >
                                    {product.vendor}
                                </Link>
                            </header>

                            <div className="flex flex-row items-center gap-2 md:gap-4">
                                <Suspense fallback={<ProductPricingSkeleton />}>
                                    <ProductPricing product={product} />
                                </Suspense>
                            </div>

                            <InfoLines product={product} />
                        </div>

                        <div className="flex flex-col items-stretch justify-start gap-2">
                            <Suspense fallback={<ProductContentSkeleton />}>
                                <ProductContent shop={shop} product={product} i18n={i18n} />
                            </Suspense>
                        </div>

                        <Suspense fallback={<Content />}>
                            <Content
                                dangerouslySetInnerHTML={{
                                    __html: content
                                }}
                            />
                        </Suspense>

                        <section className="mt-8 flex w-full flex-col gap-4 xl:rounded-lg xl:bg-gray-100 xl:p-4">
                            <Suspense fallback={null}>
                                <ImportantProductDetails locale={locale} data={product} />
                            </Suspense>

                            <Suspense fallback={<div />}>
                                <div className="flex flex-col gap-4 xl:grid xl:grid-cols-2">
                                    <ProductDetails locale={locale} data={product} />
                                </div>
                            </Suspense>
                        </section>
                    </div>
                </section>

                <div className="flex flex-col gap-4 pt-8 md:gap-8">
                    <section className="flex flex-col gap-4 rounded-lg bg-gray-100 p-4">
                        <h3 className="center text-lg font-semibold leading-none md:text-xl">{t('recommendations')}</h3>

                        <Suspense fallback={<RecommendedProducts.skeleton />}>
                            <RecommendedProducts shop={shop} locale={locale} product={product} />
                        </Suspense>
                    </section>
                </div>

                <Breadcrumbs shop={shop} title={`${product.vendor} ${product.title}`} />

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
