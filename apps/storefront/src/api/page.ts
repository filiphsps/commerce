import type { OnlineShop } from '@nordcom/commerce-db';
import { Error as CommerceError } from '@nordcom/commerce-errors';
import type { PrismicDocument } from '@prismicio/client';
import type { PageData, PageType } from '@/api/prismic/page';
import { PageApi as PrismicPageApi, PagesApi as PrismicPagesApi } from '@/api/prismic/page';
import { ShopifyApolloApiClient } from '@/api/shopify';
import type { NormalizedShopifyPage } from '@/api/shopify/page';
import { ShopifyPageApi, ShopifyPagesApi } from '@/api/shopify/page';
import type { Locale } from '@/utils/locale';

export type ProvidedPage =
    | { provider: 'prismic'; data: PageData<'custom_page'> }
    | { provider: 'shopify'; data: NormalizedShopifyPage };

export type ProvidedPages =
    | { provider: 'prismic'; items: PrismicDocument[] }
    | { provider: 'shopify'; items: NormalizedShopifyPage[] };

export async function PagesApi({ shop, locale }: { shop: OnlineShop; locale: Locale }): Promise<ProvidedPages | null> {
    switch (shop.contentProvider.type) {
        case 'prismic': {
            const items = await PrismicPagesApi({ shop, locale });
            if (!items) return null;
            return { provider: 'prismic', items };
        }
        case 'shopify': {
            const api = await ShopifyApolloApiClient({ shop, locale });
            const [items, err] = await ShopifyPagesApi({ api });
            if (err) {
                if (!CommerceError.isNotFound(err)) console.error(err);
                return null;
            }
            return { provider: 'shopify', items };
        }
        default: {
            // Unsupported / unimplemented content providers (e.g. `builder.io`) —
            // degrade gracefully so the page renders without CMS content instead
            // of throwing and 500ing the whole route.
            return null;
        }
    }
}

export async function PageApi({
    shop,
    locale,
    handle,
    type,
}: {
    shop: OnlineShop;
    locale: Locale;
    handle: string;
    type?: string;
}): Promise<ProvidedPage | null> {
    switch (shop.contentProvider.type) {
        case 'prismic': {
            const data = await PrismicPageApi({ shop, locale, handle, type: type as PageType });
            if (!data) return null;
            return { provider: 'prismic', data: data as PageData<'custom_page'> };
        }
        case 'shopify': {
            const api = await ShopifyApolloApiClient({ shop, locale });
            const [data, err] = await ShopifyPageApi({ api, handle });
            if (err) {
                if (!CommerceError.isNotFound(err)) console.error(err);
                return null;
            }
            return { provider: 'shopify', data };
        }
        default: {
            return null;
        }
    }
}
