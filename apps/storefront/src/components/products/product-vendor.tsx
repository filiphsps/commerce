import type { OnlineShop } from '@nordcom/commerce-db';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { CollectionApi } from '@/api/_loaders';
import type { Product } from '@/api/product';
import { ShopifyApiClient } from '@/api/shopify';

import Link from '@/components/link';
import type { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { TitleToHandle } from '@/utils/title-to-handle';

export type ProductVendorProps = {
    shop: OnlineShop;
    locale: Locale;
    product: Product;
    prefix?: ReactNode;
} & Omit<ComponentPropsWithoutRef<'a'>, 'ref' | 'children' | 'prefix' | 'href'>;

/**
 * Async server component rendering the product vendor as a link. Prefers the vendor's own collection
 * (`/collections/<handle>/`) and falls back to the all-products listing filtered by vendor
 * (`/products/?vendor=<name>`) when no such collection exists — so the vendor is never a dead end
 * (overhaul spec #3).
 *
 * @param props.shop - Shop record used to instantiate the Shopify API client.
 * @param props.locale - Locale used for the API client.
 * @param props.product - Product providing the vendor name.
 * @param props.prefix - Optional node rendered before the vendor name.
 * @param props.className - CSS class names applied to the link.
 * @returns The vendor link, or `null` when `vendor` is absent.
 */
export async function ProductVendor({
    shop,
    locale,
    product: { vendor: productVendor },
    prefix = null,
    className,
    ...props
}: ProductVendorProps) {
    if (!productVendor) {
        return null;
    }

    const vendorTextElement = (
        <>
            {prefix}
            {productVendor}
        </>
    );
    const vendor = TitleToHandle(productVendor.toLowerCase().trim());

    let collectionHandle: string | null = null;
    try {
        const api = await ShopifyApiClient({ shop, locale });
        collectionHandle = (await CollectionApi({ handle: vendor, api, first: 1 })).handle;
    } catch {
        // No vendor collection (or a transient lookup failure): fall through to the filtered
        // all-products listing below so the vendor still links somewhere useful.
        collectionHandle = null;
    }

    const href = collectionHandle
        ? `/collections/${collectionHandle}/`
        : `/products/?vendor=${encodeURIComponent(productVendor)}`;

    return (
        <Link {...props} className={cn('hover:text-primary', className)} href={href}>
            {vendorTextElement}
        </Link>
    );
}
