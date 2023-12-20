import 'server-only';

import { PageApi } from '@/api/page';
import { ProductReviewsApi } from '@/api/product-reviews';
import { ShopApi, ShopsApi } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { ProductApi, ProductsApi } from '@/api/shopify/product';
import { StoreApi } from '@/api/store';
import Gallery from '@/components/Gallery';
import { Page } from '@/components/layout/page';
import SplitView from '@/components/layout/split-view';
import Link from '@/components/link';
import PrismicPage from '@/components/prismic-page';
import { InfoLines } from '@/components/products/info-lines';
import { Content } from '@/components/typography/content';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { BuildConfig } from '@/utils/build-config';
import { Error } from '@/utils/errors';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { ProductToMerchantsCenterId } from '@/utils/merchants-center-id';
import { Prefetch } from '@/utils/prefetch';
import { TitleToHandle } from '@/utils/title-to-handle';
import { asText } from '@prismicio/client';
import { parseGid } from '@shopify/hydrogen-react';
import type { Metadata } from 'next';
import { ProductJsonLd } from 'next-seo';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { metadata as notFoundMetadata } from '../../not-found';
import styles from './page.module.scss';
import { ProductContent, ProductPricing } from './product-content';

/* c8 ignore start */
export const revalidate = 28_800; // 8hrs.
export const dynamicParams = true;
export async function generateStaticParams() {
    //const locale = Locale.default;
    const shops = await ShopsApi();

    const pages = (
        await Promise.all(
            shops
                .filter((shop) => shop.domains.primary !== 'demo.nordcom.io') // TEMP
                .map(async (shop) => {
                    try {
                        //const api = await ShopifyApolloApiClient({ shop, locale });
                        //const locales = await LocalesApi({ api });

                        return await Promise.all(
                            ['en-US', 'de-DE', 'en-GB', 'en-CA', 'en-AU'] // TODO: Don't hardcode these ones.
                                .map(async (locale) => {
                                    try {
                                        const api = await ShopifyApolloApiClient({ shop, locale: Locale.from(locale) });
                                        const { products } = await ProductsApi({ api });

                                        // TODO: This is a hack to prevent us from building way too many pages.
                                        return products.slice(0, 25).map(({ node: { handle } }) => ({
                                            domain: shop.domains.primary,
                                            locale: locale,
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

    // FIXME: We have already looped through all pages when we get here which is really inefficient.
    if (BuildConfig.build.limit_pages) {
        return pages.slice(0, BuildConfig.build.limit_pages);
    }

    return pages;
}

export type ProductPageParams = { domain: string; locale: string; handle: string };
export async function generateMetadata({
    params: { domain, locale: localeData, handle }
}: {
    params: ProductPageParams;
}): Promise<Metadata> {
    try {
        if (!isValidHandle(handle)) return notFound();

        const locale = Locale.from(localeData);
        if (!locale) return notFound();

        // Fetch the current shop.
        const shop = await ShopApi({ domain, locale });

        // Setup the AbstractApi client.
        const api = await ShopifyApolloApiClient({ shop, locale });

        // Do the actual API calls.
        const product = await ProductApi({ api, handle });
        const { page } = await PageApi({ shop, locale, handle, type: 'product_page' });
        const locales = await LocalesApi({ api });

        const title = page?.meta_title || product.seo?.title || `${product.vendor} ${product.title}`;
        const description = asText(page?.meta_description) || product.seo?.description || product.description;
        return {
            title,
            description,
            alternates: {
                canonical: `https://${domain}/${locale.code}/products/${handle}/`,
                languages: locales.reduce(
                    (prev, { code }) => ({
                        ...prev,
                        [code]: `https://${domain}/${code}/products/${handle}/`
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
                images: page?.meta_image?.dimensions ? [{
                    url: page.meta_image.url!,
                    width: page.meta_image.dimensions.width!,
                    height: page.meta_image.dimensions.height!
                }] : undefined
            }
        };
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return notFound();
        }

        throw error;
    }
}
/* c8 ignore stop */

export default async function ProductPage({
    params: { domain, locale: localeData, handle }
}: {
    params: ProductPageParams;
}) {
    try {
        if (!isValidHandle(handle)) return notFound();

        // Creates a locale object from a locale code (e.g. `en-US`).
        const locale = Locale.from(localeData);
        if (!locale) return notFound();

        // Fetch the current shop.
        const shop = await ShopApi({ domain, locale });

        // Setup the AbstractApi client.
        const api = await ShopifyApolloApiClient({ shop, locale });

        // Next.js Preloading pattern.
        ProductApi.preload({ api, handle });
        PageApi.preload({ shop, locale, handle });

        // Get dictionary of strings for the current locale.
        const i18n = await getDictionary({ shop, locale });

        // Do the actual API calls.
        const store = await StoreApi({ api });
        const product = await ProductApi({ api, handle });
        const reviews = await ProductReviewsApi({ api, product });
        const { page } = await PageApi({ shop, locale, handle, type: 'product_page' });

        // Next.js Preloading pattern.
        void Prefetch({ api, page }); // TODO: Figure out a nicer way.

        // TODO: Create a proper `shopify-html-parser` to convert the HTML to React components.
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
            return notFound();
        }

        const content = todoImproperWayToHandleDescriptionFix(product?.descriptionHtml) || '';

        return (
            <Page className={styles.container}>
                <SplitView
                    primaryDesktopWidth={0.46}
                    primaryClassName={styles.headingPrimary}
                    asideDesktopWidth={0.54}
                    aside={
                        <Gallery
                            initialImageId={variant?.image?.id || product.images?.edges?.[0].node.id}
                            images={product.images}
                            className={styles.gallery}
                        />
                    }
                    padding
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
                                    <Link href={`/collections/${TitleToHandle(product.vendor)}`}>{product.vendor}</Link>
                                }
                                reverse
                                bold
                            />
                        </SplitView>

                        <Suspense>
                            <ProductContent product={product} initialVariant={initialVariant} i18n={i18n}>
                                <InfoLines product={product} />
                            </ProductContent>
                        </Suspense>

                        {content ? (
                            <>
                                <Content
                                    className={styles.description}
                                    dangerouslySetInnerHTML={{
                                        __html: content
                                    }}
                                />
                            </>
                        ) : null}

                        {page?.slices && page?.slices.length > 0 ? (
                            <>
                                <div className={styles.contentDivider} />

                                <PrismicPage
                                    shop={shop}
                                    store={store}
                                    locale={locale}
                                    page={page}
                                    i18n={i18n}
                                    handle={handle}
                                    type={'product_page'}
                                />
                            </>
                        ) : null}
                    </div>
                </SplitView>

                <ProductJsonLd
                    useAppDir={true}
                    key={variant?.id}
                    keyOverride={`item_${variant?.id}`}
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
                    images={
                        (product.images?.edges?.map?.((edge) => edge?.node?.url).filter((i) => i) as string[]) || []
                    }
                    description={product.description || ''}
                    // TODO: Utility function.
                    reviews={
                        reviews?.reviews?.map(({ rating, title, body, author, createdAt }) => ({
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
                                name: store.name
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
                            url: `https://${shop.domains.primary}/${locale.code}/products/${product.handle}/?variant=${
                                parseGid(variant.id).id
                            }`,
                            seller: {
                                name: store.name
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
            </Page>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return notFound();
        }

        throw error;
    }
}
