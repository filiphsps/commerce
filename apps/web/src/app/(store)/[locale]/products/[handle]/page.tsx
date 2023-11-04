import { DefaultLocale, NextLocaleToLocale } from '@/utils/locale';
import { ProductApi, ProductsApi } from '@/api/shopify/product';

import { BuildConfig } from '@/utils/build-config';
import Gallery from '@/components/Gallery';
import Heading from '@/components/typography/heading';
import type { Metadata } from 'next';
import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';
import Page from '@/components/Page';
import { PageApi } from '@/api/page';
import { Prefetch } from '@/utils/prefetch';
import Pricing from '@/components/typography/pricing';
import PrismicPage from '@/components/prismic-page';
import SplitView from '@/components/layout/split-view';
import { StoreApi } from '@/api/store';
import { StorefrontApiClient } from '@/api/shopify';
import { Suspense } from 'react';
import { getDictionary } from '@/i18n/dictionary';
import { isValidHandle } from '@/utils/handle';
import { notFound } from 'next/navigation';

export type ProductPageParams = { locale: string; handle: string };

export async function generateStaticParams() {
    // FIXME: Pagination.
    const { products } = await ProductsApi({ client: StorefrontApiClient({ locale: DefaultLocale() }) });

    return products
        .map(({ node }) => BuildConfig.i18n.locales.map((locale) => ({ locale, handle: node.handle })))
        .flat();
}

export async function generateMetadata({ params }: { params: ProductPageParams }): Promise<Metadata | null> {
    const { locale: localeData, handle } = params;
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return null;

    const client = StorefrontApiClient({ locale });
    const product = await ProductApi({ client, handle });

    return {
        title: `${product.vendor} ${product.title}`
    };
}

export default async function ProductPage({ params }: { params: ProductPageParams }) {
    const { locale: localeData, handle } = params;

    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFound();
    const i18n = await getDictionary(locale);

    if (!isValidHandle(handle)) return notFound();

    const client = StorefrontApiClient({ locale });
    const store = await StoreApi({ locale, shopify: client });
    const product = await ProductApi({ client, handle });

    const { page } = await PageApi({ locale, handle, type: 'product_page' });
    const prefetch = (page && (await Prefetch({ client, page }))) || null;

    return (
        <Page>
            <SplitView
                aside={
                    !!product?.images?.edges?.[0] && (
                        <Gallery selected={product.images.edges[0].node.id!} images={product.images} />
                    )
                }
                style={{
                    gap: 'var(--block-spacer)'
                }}
            >
                <Heading title={product.title} subtitle={product.vendor} reverse />
                <Pricing
                    price={product.variants.edges[0].node.price}
                    compareAtPrice={product.variants.edges[0].node.compareAtPrice as MoneyV2 | undefined}
                />

                <Suspense>
                    {page?.slices && page?.slices.length <= 0 && (
                        <PrismicPage
                            store={store}
                            locale={locale}
                            page={page}
                            prefetch={prefetch}
                            i18n={i18n}
                            handle={handle}
                            type={'product_page'}
                        />
                    )}
                </Suspense>
            </SplitView>
        </Page>
    );
}
