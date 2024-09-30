import type { OnlineShop } from '@nordcom/commerce-db';

import { ShopifyApiClient } from '@/api/shopify';
import { CollectionApi } from '@/api/shopify/collection';
import { cn } from '@/utils/tailwind';
import { TitleToHandle } from '@/utils/title-to-handle';

import Link from '@/components/link';

import type { Product } from '@/api/product';
import type { Locale } from '@/utils/locale';
import type { ReactNode } from 'react';

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
    className
}: ProductCategoryProps) {
    if (!productType) {
        return null;
    }

    const typeTextElement = <>{productType}</>;
    const type = TitleToHandle(productType.toLowerCase().trim());

    try {
        const api = await ShopifyApiClient({ shop, locale });
        const collection = await CollectionApi({ handle: type, api, first: 1 });
        return (
            <>
                {prefix}
                <Link className={cn('hover:text-primary', className)} href={`/collections/${collection.handle}/`}>
                    {typeTextElement}
                </Link>
            </>
        );
    } catch {
        return (
            <>
                {prefix}
                {typeTextElement}
            </>
        );
    }
}
