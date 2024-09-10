import type { OnlineShop } from '@nordcom/commerce-db';

import { ShopifyApiClient } from '@/api/shopify';
import { CollectionApi } from '@/api/shopify/collection';
import { cn } from '@/utils/tailwind';
import { TitleToHandle } from '@/utils/title-to-handle';

import Link from '@/components/link';

import type { Product } from '@/api/product';
import type { Locale } from '@/utils/locale';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export type ProductVendorProps = {
    shop: OnlineShop;
    locale: Locale;
    product: Product;
    prefix?: ReactNode;
} & Omit<ComponentPropsWithoutRef<'div'>, 'ref' | 'children' | 'prefix'>;

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

    try {
        const api = await ShopifyApiClient({ shop, locale });
        const collection = await CollectionApi({ handle: vendor, api, first: 1 });
        return (
            <Link
                {...(props as any)}
                className={cn('hover:text-primary', className)}
                href={`/collections/${collection.handle}/`}
            >
                {vendorTextElement}
            </Link>
        );
    } catch (error) {
        console.error(error);
        return (
            <div {...(props as any)} title={undefined} className={cn(className)}>
                {vendorTextElement}
            </div>
        );
    }
}
