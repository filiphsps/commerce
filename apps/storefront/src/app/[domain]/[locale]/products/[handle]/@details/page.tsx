import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { ProductApi } from '@/api/shopify/product';
import { type ProductPageParams } from '@/pages/products/[handle]/page';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { notFound } from 'next/navigation';

import { ProductDescription } from '@/components/products/product-description';

import { ProductDetails } from '../product-details';

async function Content({ shop, locale, handle }: { shop: OnlineShop; locale: Locale; handle: string }) {
    const api = await ShopifyApolloApiClient({ shop, locale });
    const product = await ProductApi({
        api,
        handle
        //fragment: /* GraphQL */ `
        /*    handle

            descriptionHtml
            originalName: metafield(namespace: "store", key: "original-name") {
                id
                namespace
                value
                type
            }
        `*/
    });

    return <ProductDetails data={product} locale={locale} />;
}

export default async function ProductModalDescription({ params }: Readonly<{ params: ProductPageParams }>) {
    const { domain, locale: localeData, handle } = await params;
    if (!isValidHandle(handle)) {
        notFound();
    }

    const locale = Locale.from(localeData);
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });

    return (
        <Suspense key={`products.${handle}.details.details`} fallback={<ProductDescription.skeleton />}>
            <div className="flex flex-wrap gap-2 empty:hidden">
                <Content shop={shop} locale={locale} handle={handle} />
            </div>
        </Suspense>
    );
}
