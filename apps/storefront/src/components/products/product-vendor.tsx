import type { OnlineShop } from '@nordcom/commerce-db';
import { NotFoundError } from '@nordcom/commerce-errors';
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
 * Async server component rendering the product vendor as a linked collection, falling back to plain text.
 *
 * @param props.shop - Shop record used to instantiate the Shopify API client.
 * @param props.locale - Locale used for the API client.
 * @param props.product - Product providing the vendor name.
 * @param props.prefix - Optional node rendered before the vendor name.
 * @param props.className - CSS class names applied to the link or wrapper element.
 * @returns The vendor link, plain-text div, or `null` when `vendor` is absent.
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

    let collection: Awaited<ReturnType<typeof CollectionApi>>;
    try {
        const api = await ShopifyApiClient({ shop, locale });
        collection = await CollectionApi({ handle: vendor, api, first: 1 });
    } catch (error: unknown) {
        if (!(error instanceof NotFoundError)) {
            return null; // NO-OP.
        }

        return (
            <div {...(props as ComponentPropsWithoutRef<'div'>)} title={undefined} className={cn(className)}>
                {vendorTextElement}
            </div>
        );
    }

    return (
        <Link {...props} className={cn('hover:text-primary', className)} href={`/collections/${collection.handle}/`}>
            {vendorTextElement}
        </Link>
    );
}
