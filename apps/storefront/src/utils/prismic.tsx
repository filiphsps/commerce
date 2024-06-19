import type { PrismicContentProvider, Shop } from '@nordcom/commerce-database';
import type { OnlineShop } from '@nordcom/commerce-db';
import { InvalidShopError } from '@nordcom/commerce-errors';

import { Locale } from '@/utils/locale';
import * as prismic from '@prismicio/client';
import { enableAutoPreviews } from '@prismicio/next';

import type { Client, ClientConfig, LinkResolverFunction } from '@prismicio/client';

type CreateClientOptions = {
    shop: OnlineShop | Shop;
    locale: Locale;
} & ClientConfig;

export const createClient = ({ shop, locale, ...config }: CreateClientOptions): Client => {
    if (shop.contentProvider.type !== 'prismic') {
        throw new InvalidShopError("Prismic isn't configured for this shop.");
    }

    const contentProvider = shop.contentProvider as PrismicContentProvider;
    const repository = contentProvider.repositoryName || contentProvider.repository.split('//')[1].split('.')[0];

    const accessToken = contentProvider.authentication?.token || undefined;

    const client = prismic.createClient(repository, {
        accessToken,
        routes,
        defaultParams: {
            lang: locale.code
        },
        ...config
    });

    enableAutoPreviews({ client });

    return client;
};

export const linkResolver: LinkResolverFunction<any> = (doc) => {
    const { code: locale } = Locale.from(doc.lang || Locale.default.code)!;

    // TODO: Deal with tenants that don't use locales in their paths.
    if (doc.type === 'custom_page') {
        if (doc.uid === 'homepage') return `/${locale}/`;
        else if (doc.uid === 'countries') return `/${locale}/countries/`;
        else if (doc.uid === 'search') return `/${locale}/search/`;
        else if (doc.uid === 'cart') return `/${locale}/cart/`;
        else if (doc.uid === 'blog') return `/${locale}/blog/`;
        // TODO: Handle pages with multi-level paths.
        else if (doc.uid) return `/${locale}/${doc.uid}/`;
    } else if (doc.type === 'product_page') {
        return `/${locale}/products/${doc.uid}/`;
    } else if (doc.type === 'collection_page') {
        return `/${locale}/collection/${doc.uid}/`;
    } else if (doc.type === 'article_page') {
        return `/${locale}/blog/${doc.uid}/`;
    }

    return null;
};

/**
 * A list of Route Resolver objects that define how a document's `url` field
 * is resolved.
 *
 * {@link https://prismic.io/docs/route-resolver#route-resolver}
 */
export const routes: ClientConfig['routes'] = [
    {
        type: 'custom_page',
        uid: 'homepage',
        path: '/:lang/'
    },
    {
        type: 'custom_page',
        uid: 'countries',
        path: '/:lang/countries/'
    },
    {
        type: 'custom_page',
        uid: 'search',
        path: '/:lang/search/'
    },
    {
        type: 'custom_page',
        uid: 'cart',
        path: '/:lang/cart/'
    },
    {
        type: 'product_page',
        path: '/:lang/products/:uid/'
    },
    {
        type: 'collection_page',
        path: '/:lang/collections/:uid/'
    },
    {
        type: 'custom_page',
        uid: 'blog',
        path: '/:lang/blog/'
    },
    {
        type: 'custom_page',
        path: '/:lang/blog/:uid/'
    },
    {
        type: 'custom_page',
        path: '/:lang/:uid/'
    }
];
