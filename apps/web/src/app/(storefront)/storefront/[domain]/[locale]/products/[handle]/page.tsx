import { PageApi } from '@/api/page';
import { ProductReviewsApi } from '@/api/product-reviews';
import { ShopApi } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { ProductApi } from '@/api/shopify/product';
import { StoreApi } from '@/api/store';
import Gallery from '@/components/Gallery';
import { Page } from '@/components/layout/page';
import SplitView from '@/components/layout/split-view';
import Link from '@/components/link';
import PrismicPage from '@/components/prismic-page';
import { ProductActionsContainer } from '@/components/products/product-actions-container';
import { Content } from '@/components/typography/content';
import Heading from '@/components/typography/heading';
import Pricing from '@/components/typography/pricing';
import { getDictionary } from '@/i18n/dictionary';
import { Error } from '@/utils/errors';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { ProductToMerchantsCenterId } from '@/utils/merchants-center-id';
import { Prefetch } from '@/utils/prefetch';
import { TitleToHandle } from '@/utils/title-to-handle';
import { asText } from '@prismicio/client';
import { parseGid } from '@shopify/hydrogen-react';
import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';
import type { Metadata } from 'next';
import { ProductJsonLd } from 'next-seo';
import { RedirectType, notFound, redirect } from 'next/navigation';
import { metadata as notFoundMetadata } from '../../not-found';
import styles from './page.module.scss';

/* c8 ignore start */
export const revalidate = 28_800; // 8hrs.
export const dynamicParams = true;
// TODO: Replace `searchParams` with subpath so we can server render this.
/* c8 ignore stop */

/* c8 ignore start */
export type ProductPageParams = { domain: string; locale: string; handle: string };
export type ProductPageQueryParams = { variant?: string };
export async function generateMetadata({
    params: { domain, locale: localeData, handle },
    searchParams
}: {
    params: ProductPageParams;
    searchParams?: ProductPageQueryParams;
}): Promise<Metadata> {
    try {
        if (!isValidHandle(handle)) return notFound();

        // Creates a locale object from a locale code (e.g. `en-US`).
        const locale = Locale.from(localeData);
        if (!locale) return notFoundMetadata;

        // Fetch the current shop.
        const shop = await ShopApi({ domain, locale });

        // Setup the AbstractApi client.
        const api = await ShopifyApolloApiClient({ shop, locale });

        // Next.js Preloading pattern.
        PageApi.preload({ shop, locale, handle });

        // Do the actual API calls.
        const store = await StoreApi({ api });
        const product = await ProductApi({ api, handle });
        const { page } = await PageApi({ shop, locale, handle, type: 'product_page' });
        const locales = store.i18n?.locales || [Locale.default]; // TODO: Handle this better since the fallback may not include the current locale.

        const url = `/products/${handle}/${(searchParams?.variant && `?variant=${searchParams.variant}`) || ''}`; // TODO: remember existing query parameters.
        const title = page?.meta_title || `${product.vendor} ${product.title}`;
        const description = asText(page?.meta_description) || product.description;
        // TODO: Add Product Image as fallback.
        const image =
            (page?.meta_image &&
                page.meta_image.dimensions && {
                    url: page.meta_image.url,
                    width: page.meta_image.dimensions.width,
                    height: page.meta_image.dimensions.height
                }) ||
            undefined;

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
                url: `${url}`,
                type: 'website',
                title,
                description,
                siteName: store?.name,
                locale: locale.code,
                images: image
            }
        };
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return notFoundMetadata;
        }

        throw error;
    }
}
/* c8 ignore stop */

export default async function ProductPage({
    params: { domain, locale: localeData, handle },
    searchParams
}: {
    params: ProductPageParams;
    searchParams?: ProductPageQueryParams;
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
        PageApi.preload({ shop, locale, handle });

        // Get dictionary of strings for the current locale.
        const i18n = await getDictionary({ shop, locale });

        if (searchParams?.variant && searchParams?.variant.match(/^(?![0-9]+$).*/)) {
            const variant = searchParams?.variant.split('/').at(-1);
            if (!variant) {
                console.error(`404: Invalid variant "${searchParams?.variant}"`);
                return notFound();
            }

            // Remove `gid` from variant parameter.
            // TODO: remember existing query parameters.
            return redirect(`/products/${handle}/?variant=${variant}`, RedirectType.replace);
        }

        // Do the actual API calls.
        const store = await StoreApi({ api });
        const product = await ProductApi({ api, handle });
        const reviews = await ProductReviewsApi({ api, product });

        const { page } = await PageApi({ shop, locale, handle, type: 'product_page' });
        const prefetch = await Prefetch({ api, page });

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
        const selectedVariant =
            product.variants.edges.length > 1
                ? (searchParams?.variant &&
                      product?.variants?.edges?.find(
                          ({ node }) => node.id === `gid://shopify/ProductVariant/${searchParams?.variant}`
                      )?.node) ||
                  undefined
                : product.variants.edges[0]!.node!;

        if (searchParams?.variant && !selectedVariant && !initialVariant) {
            console.error(
                `404: No variant found for product "${handle}" (variant: "${searchParams?.variant || 'default'}")`
            );
            return notFound();
        }

        const variant = selectedVariant || initialVariant;
        if (!variant) {
            return notFound();
        }

        const content = todoImproperWayToHandleDescriptionFix(product?.descriptionHtml) || '';

        console.log(locale, product.variants.edges[0]!.node);

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
                                <Pricing
                                    className={styles.pricing}
                                    price={variant.price}
                                    compareAtPrice={variant.compareAtPrice as MoneyV2 | undefined}
                                />
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

                        <ProductActionsContainer
                            i18n={i18n}
                            className={styles.actions}
                            product={product as any}
                            initialVariant={initialVariant!}
                            selectedVariant={selectedVariant}
                        />

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
                                    prefetch={prefetch}
                                    i18n={i18n}
                                    handle={handle}
                                    type={'product_page'}
                                />
                            </>
                        ) : null}
                    </div>
                </SplitView>

                <ProductJsonLd
                    useAppDir
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
