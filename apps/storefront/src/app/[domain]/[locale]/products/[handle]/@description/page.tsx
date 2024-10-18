import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { ProductApi } from '@/api/shopify/product';
import { BLOCK_STYLES, type ProductPageParams } from '@/pages/products/[handle]/page';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { notFound } from 'next/navigation';

import { ProductDescription } from '@/components/products/product-description';

async function Content({ shop, locale, handle }: { shop: OnlineShop; locale: Locale; handle: string }) {
    const api = await ShopifyApolloApiClient({ shop, locale });

    const [product, productError] = await ProductApi({
        api,
        handle,
        fragment: /* GraphQL */ `
            handle

            descriptionHtml
            originalName: metafield(namespace: "store", key: "original-name") {
                id
                namespace
                value
                type
            }
        `
    });
    if (productError) {
        if (Error.isNotFound(productError)) {
            notFound();
        }

        console.error(productError);
        throw productError;
    }

    return (
        <ProductDescription
            shop={shop}
            locale={locale}
            product={product}
            className={cn(BLOCK_STYLES, 'bg-transparent')}
        />
    );
}

export default async function ProductModalDescription({ params }: Readonly<{ params: ProductPageParams }>) {
    const { domain, locale: localeData, handle } = await params;
    if (!isValidHandle(handle)) {
        notFound();
    }

    const locale = Locale.from(localeData);
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });

    return (
        <Suspense fallback={<ProductDescription.skeleton />}>
            <Content shop={shop} locale={locale} handle={handle} />
        </Suspense>
    );
}
