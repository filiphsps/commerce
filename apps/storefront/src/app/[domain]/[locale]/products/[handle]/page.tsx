import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';
import { parseGid } from '@shopify/hydrogen-react';
import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { LocalesApi, ProductApi, ProductMetadataApi, Shop } from '@/api/_loaders';
import type { Product } from '@/api/product';
import { isProductVegan } from '@/api/product';
import { ShopifyApiClient, ShopifyApolloApiClient } from '@/api/shopify';
import { Blocks } from '@/blocks/blocks';
import type { BlockNode } from '@/blocks/types';
import { CMSContent } from '@/components/cms/cms-content';
import { Card } from '@/components/layout/card';
import { AttributeIcon } from '@/components/products/attribute-icon';
import { InfoLines } from '@/components/products/info-lines';
import { ProductCategory } from '@/components/products/product-category';
import { ProductVendor } from '@/components/products/product-vendor';
import { getDictionary } from '@/i18n/dictionary';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import { isValidHandle } from '@/utils/handle';
import type { LocaleDictionary } from '@/utils/locale';
import { capitalize, getTranslations, Locale } from '@/utils/locale';
import { checkAndHandleRedirect } from '@/utils/redirect';
import { cn } from '@/utils/tailwind';
import { ProductContent, ProductPricing, ProductSavings } from './product-content';
import type { ProductPageParams } from './static-params';
import { BLOCK_STYLES } from './styles';

export { generateStaticParams, type ProductPageParams } from './static-params';

type SearchParams = Promise<{
    variant?: string;
}>;

async function buildMetadata(
    domain: string,
    localeData: string,
    handle: string,
    variantParam: string | undefined,
): Promise<Metadata> {
    'use cache';
    cacheLife('days');

    if (!isValidHandle(handle) || !isValidHandle(domain)) {
        notFound();
    }

    const locale = Locale.from(localeData);

    let shop: OnlineShop;
    try {
        shop = await Shop.findByDomain(domain, { sensitiveData: true });
    } catch (_error: unknown) {
        notFound();
    }

    const api = await ShopifyApiClient({ shop, locale });

    const [product, productError] = await ProductApi({ api, handle });
    if (productError) {
        if (Error.isNotFound(productError)) {
            await checkAndHandleRedirect({ domain, locale: Locale.from(localeData), path: `/products/${handle}` });
            notFound();
        }

        throw productError;
    }

    const initialVariant = firstAvailableVariant(product);
    if (!initialVariant) {
        notFound();
    }

    const [locales, cmsMeta] = await Promise.all([LocalesApi({ api }), ProductMetadataApi({ shop, locale, handle })]);

    let search = '';
    if (variantParam && variantParam !== parseGid(initialVariant.id).id) {
        search = `?variant=${variantParam}`;
    }

    const cmsSeoImageUrl = (() => {
        const img = cmsMeta?.seo?.image;
        return img && typeof img === 'object' && 'url' in img ? (img.url ?? undefined) : undefined;
    })();

    const title = cmsMeta?.seo?.title || product.seo.title || `${product.vendor} ${product.title}`;
    const description = cmsMeta?.seo?.description || product.seo.description || product.description;
    const index = cmsMeta?.seo?.noindex !== true;
    const keywords = cmsMeta?.seo?.keywords ?? undefined;

    return {
        title,
        description,
        keywords,
        robots: { index },
        alternates: {
            canonical: `https://${shop.domain}/${locale.code}/products/${handle}/${search}`,
            languages: Object.fromEntries(
                locales.map(({ code }) => [code, `https://${shop.domain}/${code}/products/${handle}/${search}`]),
            ),
        },
        openGraph: {
            url: `/products/${handle}/`,
            title,
            description,
            siteName: shop.name,
            locale: locale.code,
            images: cmsSeoImageUrl ? [{ url: cmsSeoImageUrl }] : undefined,
        },
    };
}

export async function generateMetadata({
    params,
    searchParams: queryParams,
}: {
    params: ProductPageParams;
    searchParams: SearchParams;
}): Promise<Metadata> {
    const [{ domain, locale: localeData, handle }, searchParams] = await Promise.all([params, queryParams]);
    return buildMetadata(domain, localeData, handle, searchParams.variant);
}

async function Badges({ product, i18n }: { product: Product; i18n: LocaleDictionary }) {
    const badges: ReactNode[] = [];

    const { t } = getTranslations('product', i18n);

    if (isProductVegan(product)) {
        badges.push(
            <div
                key={'badge-attribute-vegan'}
                className="flex items-center justify-center gap-1 rounded-2xl bg-green-600 stroke-white p-[0.4rem] px-3 font-semibold text-white text-xs uppercase leading-none"
                title={t('this-product-is-vegan')}
                data-nosnippet={true}
            >
                <AttributeIcon data={'vegan'} className="h-4" />
                {capitalize(t('vegan'))}
            </div>,
        );
    }

    if (badges.length <= 0) {
        return null;
    }

    return <div className="flex items-center gap-1 empty:hidden">{badges}</div>;
}

export default async function ProductPage({ params }: { params: ProductPageParams }) {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData, handle } = await params;
    if (!isValidHandle(handle)) {
        notFound();
    }

    const locale = Locale.from(localeData);

    let shop: OnlineShop;
    try {
        shop = await Shop.findByDomain(domain, { sensitiveData: true });
    } catch (_error: unknown) {
        notFound();
    }

    const api = await ShopifyApolloApiClient({ shop, locale });

    const [product, productError] = await ProductApi({ api, handle });
    if (productError) {
        if (Error.isNotFound(productError)) {
            await checkAndHandleRedirect({ domain, locale: Locale.from(localeData), path: `/products/${handle}` });
            notFound();
        }

        throw productError;
    }

    const [cmsMeta, i18n] = await Promise.all([
        ProductMetadataApi({ shop, locale, handle }),
        getDictionary({ shop, locale }),
    ]);

    const { descriptionHtml: content } = product;
    const { t } = getTranslations('product', i18n);

    const initialVariant = firstAvailableVariant(product);
    if (!initialVariant) {
        notFound();
    }

    let title = product.title.trim();
    if (
        product.productType &&
        product.productType.length > 0 &&
        title.toLowerCase().endsWith(product.productType.toLowerCase())
    ) {
        title = title.slice(0, -product.productType.length).trim();
    }

    let productTypeElement = null;
    if (product.productType) {
        productTypeElement = (
            <span data-nosnippet={true} className="contents text-gray-700 leading-none">
                {' '}
                &ndash; <ProductCategory shop={shop} locale={locale} product={product} />
            </span>
        );
    }

    let TitleTag: 'h1' | 'div' = 'h1';
    if (content.includes('<h1')) {
        TitleTag = 'div';
    }

    return (
        <>
            <Suspense
                key={`products.${handle}.details.savings`}
                fallback={<div className="h-24 w-full" data-skeleton />}
            >
                <ProductSavings product={product} i18n={i18n} />
            </Suspense>

            <Card className={BLOCK_STYLES}>
                <div className="flex h-auto w-full flex-col justify-start gap-3">
                    <Suspense
                        key={`products.${handle}.details.badges`}
                        fallback={<div className="h-4 w-full" data-skeleton />}
                    >
                        <Badges product={product} i18n={i18n} />
                    </Suspense>

                    <header className="flex flex-col gap-3">
                        <div className="flex grow flex-col gap-0">
                            <div className="flex w-full grow flex-wrap whitespace-pre-wrap font-extrabold text-3xl leading-tight">
                                <TitleTag className="text-inherit">
                                    {title}
                                    <Suspense>{productTypeElement}</Suspense>
                                </TitleTag>
                            </div>

                            <Suspense fallback={<div className="h-4 w-36" data-skeleton />}>
                                <ProductVendor
                                    shop={shop}
                                    locale={locale}
                                    product={product}
                                    className="font-semibold text-gray-600 normal-case leading-tight transition-colors md:text-lg"
                                    title={t('browse-all-products-by-brand', product.vendor)}
                                    prefix={<span className="font-normal">{t('by')} </span>}
                                />
                            </Suspense>
                        </div>

                        <Suspense
                            key={`products.${handle}.details.pricing`}
                            fallback={<div className="h-4 w-24" data-skeleton />}
                        >
                            <div className="flex items-center justify-start gap-2 empty:hidden">
                                <ProductPricing product={product} />
                            </div>
                        </Suspense>
                    </header>
                </div>

                <Suspense
                    key={`products.${handle}.details.content`}
                    fallback={<div className="h-4 w-full" data-skeleton />}
                >
                    <ProductContent product={product} i18n={i18n} />
                </Suspense>
            </Card>

            <Card className={BLOCK_STYLES}>
                <Suspense key={`products.${handle}.details.info-lines`} fallback={<InfoLines.skeleton />}>
                    <InfoLines shop={shop} product={product} i18n={i18n} locale={locale} />
                </Suspense>
            </Card>

            {cmsMeta?.descriptionOverride ? (
                <Blocks
                    blocks={[{ blockType: 'rich-text', body: cmsMeta.descriptionOverride }] as BlockNode[]}
                    context={{ shop, locale }}
                />
            ) : null}

            <Suspense
                key={`products.${handle}.details.slices`}
                fallback={<Card className={cn(BLOCK_STYLES, 'h-32 rounded-lg')} data-skeleton />}
            >
                <section className="md:max-w-lg">
                    <CMSContent shop={shop} locale={locale} handle={handle} />
                </section>
            </Suspense>

            {cmsMeta?.blocks && cmsMeta.blocks.length > 0 ? (
                <Blocks blocks={cmsMeta.blocks as BlockNode[]} context={{ shop, locale }} />
            ) : null}
        </>
    );
}
