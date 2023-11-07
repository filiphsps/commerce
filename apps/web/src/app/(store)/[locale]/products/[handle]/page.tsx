import { ProductApi, ProductsApi } from '@/api/shopify/product';
import { DefaultLocale, NextLocaleToLocale } from '@/utils/locale';

import { PageApi } from '@/api/page';
import { StorefrontApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import Gallery from '@/components/Gallery';
import Page from '@/components/Page';
import SplitView from '@/components/layout/split-view';
import PrismicPage from '@/components/prismic-page';
import Heading from '@/components/typography/heading';
import Pricing from '@/components/typography/pricing';
import { getDictionary } from '@/i18n/dictionary';
import { BuildConfig } from '@/utils/build-config';
import { isValidHandle } from '@/utils/handle';
import { Prefetch } from '@/utils/prefetch';
import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import styles from './page.module.scss';

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
                primaryDesktopWidth={0.52}
                primaryClassName={styles.headingPrimary}
                asideDesktopWidth={0.58}
                aside={<Gallery selected={product.images.edges?.[0].node.id} images={product.images} />}
                padding
            >
                <div className={styles.content}>
                    <SplitView
                        primaryDesktopWidth={0.8}
                        asideDesktopWidth={0.2}
                        asideClassName={styles.headingAside}
                        aside={
                            <Pricing
                                price={product.variants.edges[0].node.price}
                                compareAtPrice={product.variants.edges[0].node.compareAtPrice as MoneyV2 | undefined}
                            />
                        }
                        style={{}}
                        reverse
                    >
                        <Heading title={product.title} subtitle={product.vendor} reverse bold />
                    </SplitView>

                    {page?.slices && page?.slices.length >= 0 && (
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
                </div>
            </SplitView>
        </Page>
    );
}
