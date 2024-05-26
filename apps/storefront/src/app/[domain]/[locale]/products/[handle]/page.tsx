import 'server-only';

import styles from './page.module.scss';

import { Suspense } from 'react';
import { unstable_cache as cache } from 'next/cache';
import { notFound } from 'next/navigation';
import { ProductJsonLd } from 'next-seo';

import { ShopApi } from '@nordcom/commerce-database';
import { Error } from '@nordcom/commerce-errors';

import { PageApi } from '@/api/page';
import { ProductReviewsApi } from '@/api/product-reviews';
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
import PageContent from '@/components/page-content';
import PrismicPage from '@/components/prismic-page';
import { ProductGallery } from '@/components/products/product-gallery';
import { RecommendedProducts } from '@/components/products/recommended-products';
import { Content } from '@/components/typography/content';
import Heading from '@/components/typography/heading';

import { ProductContent, ProductPricing } from './product-content';
import { ImportantProductDetails, ProductDetails } from './product-details';

import type { Metadata } from 'next';

/*export async function generateStaticParams() {
    const shops = await ShopsApi();

    const pages = (
        await Promise.all(
            shops
                .map(async (shop) => {
                    try {
                        //const api = await ShopifyApiClient({ shop, locale });
                        //await LocalesApi({ api });
                        const locales = [Locale.from('en-US'), Locale.from('en-CA'), Locale.from('en-GB')]; // TODO: Prefetch all locales when it's feasible.

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
        if (!locale) notFound();

        // Fetch the current shop.
        const shop = await ShopApi(domain, cache);

        // Setup the AbstractApi client.
        const api = await ShopifyApolloApiClient({ shop, locale });

        // Do the actual API calls.
        const product = await ProductApi({ api, handle });
        const { page } = await PageApi({ shop, locale, handle, type: 'product_page' });
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
        if (!locale) notFound();

        // Fetch the current shop.
        const shop = await ShopApi(domain, cache);
        // Setup the AbstractApi client.
        const api = await ShopifyApolloApiClient({ shop, locale });

        // Do the actual API calls.
        const product = await ProductApi({ api, handle });
        const reviews = await ProductReviewsApi({ api, product });
        const { page } = await PageApi({ shop, locale, handle, type: 'product_page' });

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

        return (
            <>
                <SplitView
                    primaryDesktopWidth={0.42}
                    primaryClassName={styles.headingPrimary}
                    asideDesktopWidth={0.58}
                    aside={
                        <Suspense key={`${shop.id}.products.${handle}.gallery`}>
                            <ProductGallery
                                initialImageId={variant.image?.id || product.images.edges[0]?.node.id}
                                images={product.images.edges.map((edge) => edge.node)}
                                className={styles.gallery}
                            />
                        </Suspense>
                    }
                >
                    <div className={styles.content}>
                        <SplitView
                            primaryDesktopWidth={'100%'}
                            asideDesktopWidth={'14rem'}
                            asideClassName={styles.headingAside}
                            aside={
                                <div className={styles.pricing}>
                                    <ProductPricing product={product} initialVariant={initialVariant} />
                                </div>
                            }
                            style={{ gap: '0', paddingBottom: 'var(--block-spacer-large)' }}
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

                        <Suspense key={`${shop.id}.products.${handle}.content`}>
                            <ProductContent product={product} initialVariant={initialVariant} i18n={i18n} />
                        </Suspense>

                        <Suspense key={`${shop.id}.products.${handle}.tabs`}>
                            <Tabs
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

                                                <Suspense key={`${shop.id}.products.${handle}.tabs.information`}>
                                                    <ImportantProductDetails locale={locale} data={product} />
                                                </Suspense>

                                                {page?.slices && page.slices.length > 0 ? (
                                                    <>
                                                        <div className={styles.contentDivider} />

                                                        <Suspense
                                                            key={`${shop.id}.products.${handle}.tabs.content`}
                                                            fallback={<PrismicPage.skeleton page={page as any} />}
                                                        >
                                                            <PrismicPage
                                                                shop={shop}
                                                                locale={locale}
                                                                page={page}
                                                                i18n={i18n}
                                                                handle={`product-${handle}`}
                                                                type={'product_page'}
                                                            />
                                                        </Suspense>
                                                    </>
                                                ) : null}
                                            </>
                                        )
                                    },
                                    {
                                        id: 'details',
                                        label: 'Details',
                                        children: (
                                            <>
                                                <Suspense key={`${shop.id}.products.${handle}.tabs.details`}>
                                                    <ProductDetails locale={locale} data={product} />
                                                </Suspense>
                                            </>
                                        )
                                    }
                                ]}
                            />
                        </Suspense>
                    </div>
                </SplitView>

                <PageContent primary={true}>
                    {page?.slices2 && page.slices2.length > 0 ? (
                        <Suspense
                            key={`${shop.id}.products.${handle}.content`}
                            fallback={<PrismicPage.skeleton page={{ slices: page.slices2 } as any} />}
                        >
                            <PrismicPage
                                shop={shop}
                                locale={locale}
                                page={
                                    {
                                        slices: page.slices2
                                    } as any
                                }
                                i18n={i18n}
                                handle={`product-${handle}-secondary`}
                                type={'product_page'}
                            />
                        </Suspense>
                    ) : null}

                    <RecommendedProducts shop={shop} locale={locale} product={product} />
                </PageContent>

                <Suspense key={`${shop.id}.products.${handle}.breadcrumbs`}>
                    <Breadcrumbs shop={shop} title={`${product.vendor} ${product.title}`} />
                </Suspense>

                {/* Metadata */}
                <ProductJsonLd
                    useAppDir={true}
                    key={variant.id}
                    keyOverride={`item_${variant.id}`}
                    productName={`${product.vendor} ${product.title} ${variant.title}`}
                    brand={product.vendor}
                    sku={ProductToMerchantsCenterId({
                        locale: locale,
                        product: {
                            productGid: product!.id,
                            variantGid: variant!.id
                        } as any
                    })}
                    mpn={variant.barcode || variant.sku || undefined}
                    images={(product.images.edges.map((edge) => edge.node.url).filter((i) => i) as string[]) || []}
                    description={product.description || ''}
                    // TODO: Utility function.
                    reviews={
                        reviews.reviews.map(({ rating, title, body, author, createdAt }) => ({
                            type: 'Review',
                            author: {
                                type: 'Person',
                                name: author
                            },
                            datePublished: createdAt,
                            reviewBody: body, // FIXME: This is shopify rich text schema, we need write a parser.
                            name: title,
                            reviewRating: {
                                bestRating: '5',
                                ratingValue: rating.toString(),
                                worstRating: '1'
                            },
                            publisher: {
                                type: 'Organization',
                                name: shop.name
                            }
                        })) || undefined
                    }
                    aggregateRating={
                        (reviews.averageRating && {
                            ratingValue: reviews.averageRating,
                            reviewCount: reviews.reviews.length
                        }) ||
                        undefined
                    }
                    offers={[
                        {
                            itemCondition: 'https://schema.org/NewCondition',
                            availability: variant.availableForSale
                                ? 'https://schema.org/InStock'
                                : 'https://schema.org/SoldOut',
                            url: `https://${shop.domain}/${locale.code}/products/${product.handle}/?variant=${
                                parseGid(variant.id).id
                            }`,
                            seller: {
                                name: shop.name
                            },
                            priceSpecification: {
                                type: 'PriceSpecification',
                                price: Number.parseFloat(variant.price.amount),
                                priceCurrency: variant.price.currencyCode
                            },

                            // TODO: Make all of the following configurable.
                            priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
                            hasMerchantReturnPolicy: {
                                type: 'MerchantReturnPolicy',
                                applicableCountry: locale.country,
                                returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted'
                            },
                            shippingDetails: {
                                type: 'OfferShippingDetails',
                                shippingRate: {
                                    type: 'MonetaryAmount',
                                    maxValue: 25,
                                    minValue: 0,
                                    currency: variant.price.currencyCode!
                                },
                                shippingDestination: [
                                    {
                                        type: 'DefinedRegion',
                                        addressCountry: locale.country
                                    }
                                ],
                                cutoffTime: '11:00:00Z',
                                deliveryTime: {
                                    type: 'ShippingDeliveryTime',
                                    handlingTime: {
                                        type: 'QuantitativeValue',
                                        minValue: 0,
                                        maxValue: 3,
                                        unitCode: 'DAY'
                                    },
                                    transitTime: {
                                        type: 'QuantitativeValue',
                                        minValue: 2,
                                        maxValue: 14,
                                        unitCode: 'DAY'
                                    }
                                }
                            }
                        }
                    ]}
                />
            </>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}
