import { ProductApi } from '@/api/shopify/product';
import { NextLocaleToLocale } from '@/utils/locale';

import { PageApi } from '@/api/page';
import { ShopApi } from '@/api/shop';
import { StorefrontApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import Gallery from '@/components/Gallery';
import { Page } from '@/components/layout/page';
import SplitView from '@/components/layout/split-view';
import Link from '@/components/link';
import PrismicPage from '@/components/prismic-page';
import { InfoLines } from '@/components/products/info-lines';
import { ProductActionsContainer } from '@/components/products/product-actions-container';
import { Content } from '@/components/typography/content';
import Heading from '@/components/typography/heading';
import Pricing from '@/components/typography/pricing';
import { getDictionary } from '@/i18n/dictionary';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import { isValidHandle } from '@/utils/handle';
import { Prefetch } from '@/utils/prefetch';
import { TitleToHandle } from '@/utils/title-to-handle';
import { asText } from '@prismicio/client';
import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';
import type { Metadata } from 'next';
import { RedirectType, notFound, redirect } from 'next/navigation';
import { metadata as notFoundMetadata } from '../../not-found';
import styles from './page.module.scss';

/* c8 ignore start */
export const revalidate = 28_800; // 8hrs.
export const dynamicParams = true;
/*export async function generateStaticParams() {
    const locale = DefaultLocale()!; // TODO: Don't hardcode locale.
    const shops = await ShopsApi();

    return await Promise.all(
        shops.flatMap(async (shop) => {
            const apiConfig = shopifyApiConfig({ shop, noHeaders: true });
            const api = StorefrontApiClient({ shop, locale, apiConfig });
            const { products } = await ProductsApi({ api });

            return products.map(({ node: { handle } }) => ({
                domain: shop.domains.primary,
                locale: locale.locale,
                handle
            }));
        })
    );
}*/
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
        const shop = await ShopApi({ domain });
        const locale = NextLocaleToLocale(localeData);
        if (!locale) return notFoundMetadata;

        const api = StorefrontApiClient({ shop, locale });
        const store = await StoreApi({ shop, locale, api });
        const product = await ProductApi({ api, handle });
        const { page } = await PageApi({ shop, locale, handle, type: 'product_page' });
        const locales = store.i18n.locales;

        const url = `/products/${handle}/${(searchParams?.variant && `?variant=${searchParams.variant}`) || ''}`; // TODO: remember existing query parameters.
        const title = page?.meta_title || `${product.vendor} ${product.title}`;
        const description = asText(page?.meta_description) || product.description;
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
                canonical: `https://${domain}/${locale.locale}/products/${handle}/`,
                languages: locales.reduce(
                    (prev, { locale }) => ({
                        ...prev,
                        [locale]: `https://${domain}/${locale}/products/${handle}/`
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
                locale: locale.locale,
                images: image
            }
        };
    } catch (error: any) {
        const message = (error?.message as string) || '';
        if (message.startsWith('404:')) {
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
        const shop = await ShopApi({ domain });
        const locale = NextLocaleToLocale(localeData);
        if (!locale) return notFound();
        const i18n = await getDictionary(locale);

        if (!isValidHandle(handle)) return notFound();
        if (searchParams?.variant && searchParams?.variant.match(/^(?![0-9]+$).*/)) {
            const variant = searchParams?.variant.split('/').at(-1);
            if (!variant) {
                console.error(`404: Invalid variant "${searchParams?.variant}"`);
                return notFound();
            }

            // Remove `gid` from variant parameter.
            // TODO: remember existing query parameters.
            return redirect(`/products/${handle}?variant=${variant}`, RedirectType.replace);
        }

        const api = StorefrontApiClient({ shop, locale });
        const store = await StoreApi({ shop, locale, api });
        const product = await ProductApi({ api, handle });

        const { page } = await PageApi({ shop, locale, handle, type: 'product_page' });
        const prefetch = (page && (await Prefetch({ api, page }))) || null;

        // TODO: Create a proper `shopify-html-parser` to convert the HTML to React components.
        const todoImproperWayToHandleDescriptionFix = (description?: string): string | null => {
            if (!description) return null;
            let result = description;

            const titleTags = new RegExp('(?<=<h1>)(.+?)(?=</h1>)').exec(description)?.[0];
            if (titleTags && result.startsWith(`<h1>${titleTags}</h1>\n`))
                result = result.replace(`<h1>${titleTags}</h1>\n`, '');
            else return null;

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

        return (
            <Page className={styles.container}>
                <SplitView
                    primaryDesktopWidth={0.48}
                    primaryClassName={styles.headingPrimary}
                    asideDesktopWidth={0.52}
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
                            locale={locale}
                            i18n={i18n}
                            className={styles.actions}
                            product={product as any}
                            initialVariant={initialVariant!}
                            selectedVariant={selectedVariant}
                        />
                        {(product && <InfoLines product={product} />) || null}

                        {content ? (
                            <>
                                <div className={styles.contentDivider} />

                                <Content
                                    dangerouslySetInnerHTML={{
                                        __html: content
                                    }}
                                />
                            </>
                        ) : null}

                        <div className={styles.contentDivider} />

                        {page?.slices && page?.slices.length > 0 && (
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
                        )}
                    </div>
                </SplitView>
            </Page>
        );
    } catch (error: any) {
        console.warn(error);
        const message = (error?.message as string) || '';
        if (message.startsWith('404:')) {
            return notFound();
        }

        throw error;
    }
}
