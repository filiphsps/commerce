import type { OnlineShop } from '@nordcom/commerce-db';

import { ShopifyApiClient } from '@/api/shopify';
import { CollectionApi } from '@/api/shopify/collection';
import { TitleToHandle } from '@/utils/title-to-handle';

import Link from '@/components/link';

import type { Product } from '@/api/product';
import type { Locale } from '@/utils/locale';

export type ProductCategoryProps = {
    shop: OnlineShop;
    locale: Locale;
    product: Product;
};

export async function ProductCategory({ shop, locale, product: { productType } }: ProductCategoryProps) {
    if (!productType) {
        return null;
    }

    const typeTextElement = <>{productType}</>;
    const type = TitleToHandle(productType.toLowerCase().trim());

    try {
        const api = await ShopifyApiClient({ shop, locale });
        const collection = await CollectionApi({ handle: type, api, first: 1 });
        return (
            <Link className="hover:text-primary" href={`/collections/${collection.handle}/`}>
                {typeTextElement}
            </Link>
        );
    } catch {
        return typeTextElement;
    }
}
