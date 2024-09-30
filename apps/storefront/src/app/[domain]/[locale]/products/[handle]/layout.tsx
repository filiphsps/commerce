import { Fragment, Suspense } from 'react';

import { Shop } from '@nordcom/commerce-db';

//import { Error } from '@nordcom/commerce-errors';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { ProductApi } from '@/api/shopify/product';
import { getDictionary } from '@/utils/dictionary';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { productToMerchantsCenterId } from '@/utils/merchants-center-id';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';
import { AnalyticsEventTrigger } from '@/utils/trackable';
import { parseGid, parseMetafield } from '@shopify/hydrogen-react';
import { notFound } from 'next/navigation';

import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import { JsonLd } from '@/components/json-ld';
import { Card } from '@/components/layout/card';
import PageContent from '@/components/page-content';

import { BLOCK_STYLES, type ProductPageParams } from './page';
import { ProductDetails } from './product-details';

import type { ParsedMetafields } from '@shopify/hydrogen-react';
import type { ReactNode } from 'react';
import type { ProductGroup, WithContext } from 'schema-dts';

export default async function ProductPageLayout({
    params,
    gallery,
    children,
    description,
    recommendations
}: Readonly<{
    params: ProductPageParams;
    gallery: ReactNode;
    children: ReactNode;
    description: ReactNode;
    recommendations: ReactNode;
}>) {
    const { domain, locale: localeData, handle } = await params;
    if (!isValidHandle(handle)) {
        notFound();
    }

    const locale = Locale.from(localeData);
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const api = await ShopifyApolloApiClient({ shop, locale });
    const product = await ProductApi({ api, handle });

    const initialVariant = firstAvailableVariant(product);
    if (!initialVariant) {
        notFound();
    }

    const i18n = await getDictionary({ shop, locale });

    let title = product.title.trim();
    if (
        product.productType &&
        product.productType.length > 0 &&
        title.toLowerCase().endsWith(product.productType.toLowerCase())
    ) {
        title = title.slice(0, -product.productType.length).trim();
    }

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

            <PageContent className="flex h-full max-w-full flex-col items-start justify-stretch gap-3 px-0 md:flex-row md:flex-nowrap md:gap-4">
                <Suspense>{gallery}</Suspense>

                <section className="flex w-full grow flex-col gap-2 overflow-hidden md:max-w-[34rem] md:gap-3">
                    <Suspense
                        key={`products.${handle}.details`}
                        fallback={<section className="w-full overflow-hidden md:max-w-[32rem]" />}
                    >
                        {children}
                    </Suspense>

                    <Card className={cn(BLOCK_STYLES, 'gap-3 lg:gap-3')}>{description}</Card>

                    <Suspense fallback={<div className="h-12 w-full" data-skeleton />}>
                        <div key={`products.${handle}.details.details`} className="flex flex-wrap gap-2 empty:hidden">
                            <ProductDetails data={product} locale={locale} />
                        </div>
                    </Suspense>
                </section>
            </PageContent>

            {recommendations}

            {/* Metadata */}
            <JsonLd data={jsonLd} />
        </>
    );
}
