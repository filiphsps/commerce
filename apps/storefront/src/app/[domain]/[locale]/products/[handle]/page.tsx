import 'server-only';

import styles from './page.module.scss';

import { Suspense } from 'react';
import { unstable_cache as cache } from 'next/cache';
import { notFound } from 'next/navigation';

import { ShopApi } from '@nordcom/commerce-database';
import { Error } from '@nordcom/commerce-errors';

import { PageApi } from '@/api/page';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { ProductApi } from '@/api/shopify/product';
import { LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { ProductToMerchantsCenterId } from '@/utils/merchants-center-id';
import { TitleToHandle } from '@/utils/title-to-handle';
import { asText } from '@prismicio/client';
import { parseGid } from '@shopify/hydrogen-react';

import Breadcrumbs from '@/components/informational/breadcrumbs';
import SplitView from '@/components/layout/split-view';
import { Tabs } from '@/components/layout/tabs';
import Link from '@/components/link';
import { InfoLines } from '@/components/products/info-lines';
import { ProductGallery } from '@/components/products/product-gallery';
import { RecommendedProducts } from '@/components/products/recommended-products';
import { Content } from '@/components/typography/content';
import Heading from '@/components/typography/heading';

import { ProductContent, ProductPricing } from './product-content';
import { ImportantProductDetails, ProductDetails } from './product-details';

import type { Metadata } from 'next';
import type { Product, WithContext } from 'schema-dts';

/*export async function generateStaticParams() {
    const shops = await ShopsApi();

    const pages = (
        await Promise.all(
            shops
                .map(async (shop) => {
                    try {
                        //const api = await ShopifyApiClient({ shop, locale });
                        //await LocalesApi({ api });

                        // TODO: Prefetch all locales when it's feasible.
                        const locales = [Locale.from('en-US')];
                        return await Promise.all(
                            locales
                                .map(async (locale) => {
                                    try {
                                        const api = await ShopifyApolloApiClient({ shop, locale });
                                        const products = await ProductsApi({ api });

                                        return products.products.map(({ node: { handle } }) => ({
                                            domain: shop.domain,
                                            locale: locale.code,
                                            handle
                                        }));
                                    } catch {
                                        return null;
                                    }
                                })
                                .filter((_) => _)
                        );
                    } catch {
                        return null;
                    }
                })
                .filter((_) => _)
        )
    ).flat(2);

    return pages;
}*/

export type ProductPageParams = { domain: string; locale: string; handle: string };
export async function generateMetadata({
    params: { domain, locale: localeData, handle }
}: {
    params: ProductPageParams;
}): Promise<Metadata> {
    try {
        if (!isValidHandle(handle)) notFound();

        const locale = Locale.from(localeData);

        // Fetch the current shop.
        const shop = await ShopApi(domain, cache);

        // Setup the AbstractApi client.
        const api = await ShopifyApolloApiClient({ shop, locale });

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

        const initialVariant =
            product.variants.edges.length > 1 ? FirstAvailableVariant(product) : product.variants.edges[0]!.node!;

        const variant = initialVariant;
        if (!variant) {
            notFound();
        }

        const content = todoImproperWayToHandleDescriptionFix(product.descriptionHtml) || '';

        const jsonLd: WithContext<Product> = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            url: `https://${shop.domain}/${locale.code}/products/${handle}/`, // FIXME: Variant.
            name: `${product.vendor} ${product.title} ${variant.title}`,
            brand: product.vendor,
            sku: ProductToMerchantsCenterId({
                locale: locale,
                product: {
                    productGid: product!.id,
                    variantGid: variant!.id
                } as any
            }),
            mpn: variant.barcode || variant.sku || undefined,
            image: initialVariant.image?.url,
            description: product.description || '',
            offers: [
                {
                    '@type': 'Offer',
                    itemCondition: 'https://schema.org/NewCondition',
                    availability: variant.availableForSale
                        ? 'https://schema.org/InStock'
                        : 'https://schema.org/SoldOut',
                    url: `https://${shop.domain}/${locale.code}/products/${product.handle}/?variant=${
                        parseGid(variant.id).id
                    }`,

                    priceSpecification: {
                        '@type': 'PriceSpecification',
                        price: Number.parseFloat(variant.price.amount),
                        priceCurrency: variant.price.currencyCode
                    },

                    // TODO: Make all of the following configurable.
                    priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
                    hasMerchantReturnPolicy: {
                        '@type': 'MerchantReturnPolicy',
                        applicableCountry: locale.country,
                        returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted'
                    },
                    shippingDetails: {
                        '@type': 'OfferShippingDetails',
                        shippingRate: {
                            '@type': 'MonetaryAmount',
                            maxValue: 25,
                            minValue: 0,
                            currency: variant.price.currencyCode!
                        },
                        shippingDestination: [
                            {
                                '@type': 'DefinedRegion',
                                addressCountry: locale.country
                            }
                        ],
                        deliveryTime: {
                            '@type': 'ShippingDeliveryTime',
                            handlingTime: {
                                '@type': 'QuantitativeValue',
                                minValue: 0,
                                maxValue: 3,
                                unitCode: 'DAY'
                            },
                            transitTime: {
                                '@type': 'QuantitativeValue',
                                minValue: 2,
                                maxValue: 14,
                                unitCode: 'DAY'
                            }
                        }
                    }
                }
            ]
        };

        return (
            <>
                <SplitView
                    primaryDesktopWidth={0.42}
                    primaryClassName={styles.headingPrimary}
                    asideDesktopWidth={0.58}
                    aside={
                        <ProductGallery
                            initialImageId={variant.image?.id || product.images.edges[0]?.node.id}
                            images={product.images.edges.map((edge) => edge.node)}
                            className={styles.gallery}
                        />
                    }
                >
                    <div className={styles.content}>
                        <SplitView
                            primaryDesktopWidth={'100%'}
                            asideDesktopWidth={'14rem'}
                            asideClassName={styles.headingAside}
                            aside={
                                <div className={styles.pricing}>
                                    <ProductPricing shop={shop} product={product} initialVariant={initialVariant} />
                                </div>
                            }
                            style={{ gap: '0' }}
                            reverse
                        >
                            <Heading
                                title={product.title}
                                subtitle={
                                    <Link
                                        href={`/collections/${TitleToHandle(product.vendor)}`}
                                        className={styles.vendor}
                                    >
                                        {product.vendor}
                                    </Link>
                                }
                                reverse
                                bold
                            />
                        </SplitView>

                        <InfoLines product={product} style={{ paddingBottom: 'var(--block-spacer-huge)' }} />

                        <ProductContent shop={shop} product={product} initialVariant={initialVariant} i18n={i18n} />

                        <Tabs
                            className={styles.tabs}
                            data={[
                                {
                                    id: 'information',
                                    label: 'Information',
                                    children: (
                                        <>
                                            <Content
                                                className={styles.description}
                                                dangerouslySetInnerHTML={{
                                                    __html: content
                                                }}
                                            />

                                            <ImportantProductDetails locale={locale} data={product} />
                                        </>
                                    )
                                },
                                {
                                    id: 'details',
                                    label: 'Details',
                                    children: <ProductDetails locale={locale} data={product} />
                                }
                            ]}
                        />
                    </div>
                </SplitView>

                <Suspense
                    key={`${shop.id}.products.${handle}.recommended-products`}
                    fallback={<RecommendedProducts.skeleton />}
                >
                    <RecommendedProducts shop={shop} locale={locale} product={product} />
                </Suspense>

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
