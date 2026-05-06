import type { OnlineShop } from '@nordcom/commerce-db';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import type { Product } from '@/api/product';
import { ShopifyApiClient } from '@/api/shopify';
import { CollectionApi } from '@/api/shopify/collection';

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
        console.error(error);

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
