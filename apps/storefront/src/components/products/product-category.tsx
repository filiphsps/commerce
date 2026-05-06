import type { OnlineShop } from '@nordcom/commerce-db';
import type { ReactNode } from 'react';
import type { Product } from '@/api/product';
import { ShopifyApiClient } from '@/api/shopify';
import { CollectionApi } from '@/api/shopify/collection';

import Link from '@/components/link';
import type { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { TitleToHandle } from '@/utils/title-to-handle';

export type ProductCategoryProps = {
    shop: OnlineShop;
    locale: Locale;
    product: Product;
    prefix?: ReactNode;
    className?: string;
};

export async function ProductCategory({
    shop,
    locale,
    product: { productType },
    prefix = null,
    className,
}: ProductCategoryProps) {
    if (!productType) {
        return null;
    }

    const typeTextElement = <>{productType}</>;
    const type = TitleToHandle(productType.toLowerCase().trim());

    let collection: Awaited<ReturnType<typeof CollectionApi>>;
    try {
        const api = await ShopifyApiClient({ shop, locale });
        collection = await CollectionApi({ handle: type, api, first: 1 });
    } catch {
        return (
            <>
                {prefix}
                {typeTextElement}
            </>
        );
    }

    return (
        <>
            {prefix}
            <Link className={cn('hover:text-primary', className)} href={`/collections/${collection.handle}/`}>
                {typeTextElement}
            </Link>
        </>
    );
}
