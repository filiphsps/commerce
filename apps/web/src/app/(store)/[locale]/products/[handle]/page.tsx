import { ProductApi, ProductsApi } from '@/api/shopify/product';
import { DefaultLocale, NextLocaleToLocale, useTranslation } from '@/utils/locale';

import { PageApi } from '@/api/page';
import { StorefrontApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import Content from '@/components/Content';
import Gallery from '@/components/Gallery';
import Page from '@/components/Page';
import SplitView from '@/components/layout/split-view';
import Link from '@/components/link';
import PrismicPage from '@/components/prismic-page';
import { ProductActionsContainer } from '@/components/products/product-actions-container';
import Heading from '@/components/typography/heading';
import Pricing from '@/components/typography/pricing';
import { getDictionary } from '@/i18n/dictionary';
import { BuildConfig } from '@/utils/build-config';
import { isValidHandle } from '@/utils/handle';
import { Prefetch } from '@/utils/prefetch';
import { TitleToHandle } from '@/utils/title-to-handle';
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
    const { t } = useTranslation('common', i18n);

    if (!isValidHandle(handle)) return notFound();

    const client = StorefrontApiClient({ locale });
    const store = await StoreApi({ locale, shopify: client });
    const product = await ProductApi({ client, handle });

    const { page } = await PageApi({ locale, handle, type: 'product_page' });
    const prefetch = (page && (await Prefetch({ client, page }))) || null;

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

    return (
        <Page className={styles.container}>
            <SplitView
                primaryDesktopWidth={0.42}
                primaryClassName={styles.headingPrimary}
                asideDesktopWidth={0.58}
                aside={
                    <Gallery
                        initialImageId={product.images.edges?.[0].node.id}
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
                                price={product.variants.edges[0].node.price}
                                compareAtPrice={product.variants.edges[0].node.compareAtPrice as MoneyV2 | undefined}
                            />
                        }
                        style={{ gap: '0' }}
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
                    />

                    <Content
                        dangerouslySetInnerHTML={{
                            __html: todoImproperWayToHandleDescriptionFix(product.descriptionHtml) || ''
                        }}
                    />

                    <div className={styles.prismicDivider} />

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

export const revalidate = 120;
