import type { OnlineShop } from '@nordcom/commerce-db';
import type { ReactNode } from 'react';
import { CollectionApi } from '@/api/_loaders';
import type { Product } from '@/api/product';
import { ShopifyApiClient } from '@/api/shopify';

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

/**
 * Async server component rendering the product's type as a link. Prefers the type's own collection
 * (`/collections/<handle>/`) and falls back to the all-products listing filtered by type
 * (`/products/?type=<name>`) when no such collection exists — so the category is never a dead end.
 *
 * @param props.shop - Shop record used to instantiate the Shopify API client.
 * @param props.locale - Locale used for the API client.
 * @param props.product - Product providing the `productType` to render.
 * @param props.prefix - Optional node rendered before the category text.
 * @param props.className - CSS class names applied to the link.
 * @returns The category link element, or `null` when `productType` is absent.
 */
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

    let collectionHandle: string | null = null;
    try {
        const api = await ShopifyApiClient({ shop, locale });
        collectionHandle = (await CollectionApi({ handle: type, api, first: 1 })).handle;
    } catch {
        collectionHandle = null;
    }

    const href = collectionHandle
        ? `/collections/${collectionHandle}/`
        : `/products/?type=${encodeURIComponent(productType)}`;

    return (
        <>
            {prefix}
            <Link className={cn('hover:text-primary', className)} href={href}>
                {typeTextElement}
            </Link>
        </>
    );
}
