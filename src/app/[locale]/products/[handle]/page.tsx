import { ProductApi, ProductsApi } from '@/api/product';

import { Config } from '@/utils/Config';
import Gallery from '@/components/Gallery';
import Heading from '@/components/typography/heading';
import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';
import { NextLocaleToLocale } from '@/utils/Locale';
import Page from '@/components/Page';
import { PageApi } from '@/api/page';
import { Prefetch } from '@/utils/Prefetch';
import Pricing from '@/components/typography/pricing';
import { SliceZone } from '@prismicio/react';
import SplitView from '@/components/layout/split-view';
import { StoreApi } from '@/api/store';
import { isValidHandle } from '@/utils/handle';
import { notFound } from 'next/navigation';
import { components as slices } from '@/slices';

export type ProductPageParams = { locale: string; handle: string };

export async function generateStaticParams() {
    // FIXME: Pagination.
    const { products } = await ProductsApi();

    return products
        .map(({ node }) => Config.i18n.locales.map((locale) => ({ locale: locale, handle: node.handle })))
        .flat();
}

export async function generateMetadata({ params }: { params: ProductPageParams }) {
    const { locale: localeData, handle } = params;
    const locale = NextLocaleToLocale(localeData);

    const product = await ProductApi({ handle, locale: locale.locale });

    return {
        title: `${product.vendor} ${product.title}`
    };
}

export default async function ProductPage({ params }: { params: ProductPageParams }) {
    const { locale: localeData, handle } = params;
    const locale = NextLocaleToLocale(localeData);

    if (!isValidHandle(handle)) return notFound();

    const store = await StoreApi({ locale: locale.locale });
    const product = await ProductApi({ handle, locale: locale.locale });

    const { page } = await PageApi({ locale, handle, type: 'product_page' });
    const prefetch = (page && (await Prefetch(page, locale.locale))) || null;

    return (
        <Page>
            <SplitView
                aside={
                    <>
                        <Gallery selected={product.images.edges[0].node.id!} images={product.images} />
                    </>
                }
            >
                <Heading title={product.title} subtitle={product.vendor} />
                <Pricing
                    price={product.variants.edges[0].node.price}
                    compareAtPrice={product.variants.edges[0].node.compareAtPrice as MoneyV2 | undefined}
                />
                {page?.slices && <SliceZone slices={page.slices} components={slices} context={{ store, prefetch }} />}
            </SplitView>
        </Page>
    );
}
