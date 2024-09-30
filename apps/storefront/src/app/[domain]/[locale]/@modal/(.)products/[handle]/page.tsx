import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';

//import { Error } from '@nordcom/commerce-errors';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { ProductApi } from '@/api/shopify/product';
import { getDictionary } from '@/utils/dictionary';
import { isValidHandle } from '@/utils/handle';
import { getTranslations, Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { notFound } from 'next/navigation';

import { Card } from '@/components/layout/card';
import { ProductCategory } from '@/components/products/product-category';
import { ProductVendor } from '@/components/products/product-vendor';

import { BLOCK_STYLES, type ProductPageParams } from '../../../products/[handle]/page';

async function HeaderContent({ shop, locale, handle }: { shop: OnlineShop; locale: Locale; handle: string }) {
    const api = await ShopifyApolloApiClient({ shop, locale });
    const product = await ProductApi({
        api,
        handle,
        fragment: /* GraphQL */ `
            handle

            title
            vendor
            productType
        `
    });

    let title = product.title.trim();
    if (
        product.productType &&
        product.productType.length > 0 &&
        title.toLowerCase().endsWith(product.productType.toLowerCase())
    ) {
        title = title.slice(0, -product.productType.length).trim();
    }

    const i18n = await getDictionary({ shop, locale });
    const { t } = getTranslations('product', i18n);

    return (
        <>
            <div className="-mt-1 block w-full grow text-3xl font-extrabold leading-tight">
                {title}
                <ProductCategory shop={shop} locale={locale} product={product} prefix={' — '} />
            </div>
            <ProductVendor
                shop={shop}
                locale={locale}
                product={product}
                className="font-semibold normal-case leading-tight text-gray-600 transition-colors md:text-lg"
                title={t('browse-all-products-by-brand', product.vendor)}
                prefix={<span className="font-normal">{t('by')} </span>}
            />
        </>
    );
}

export default async function ProductModal({ params }: Readonly<{ params: ProductPageParams }>) {
    const { domain, locale: localeData, handle } = await params;
    if (!isValidHandle(handle)) {
        notFound();
    }

    const locale = Locale.from(localeData);
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });

    return (
        <Card className={cn(BLOCK_STYLES, 'py-3')}>
            <header className="flex flex-col gap-1">
                <Suspense
                    fallback={
                        <>
                            <div className="flex w-full flex-col gap-2">
                                {handle.length > 24 ? <div className="h-9 w-full" data-skeleton /> : null}
                                <div className="h-9 w-56" data-skeleton />
                            </div>
                            <div className="mt-3 h-5 w-32" data-skeleton />
                        </>
                    }
                >
                    <HeaderContent shop={shop} locale={locale} handle={handle} />
                </Suspense>
            </header>
        </Card>
    );
}
