// import { experimental_taintUniqueValue } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';
import { InvalidContentProviderError, InvalidShopError } from '@nordcom/commerce-errors';

import { Locale } from '@/utils/locale';
import * as prismic from '@prismicio/client';

import type { Client, ClientConfig, LinkResolverFunction } from '@prismicio/client';

type CreateClientOptions = {
    shop: OnlineShop;
    locale: Locale;
} & ClientConfig;

export const createClient = ({ shop, /* locale = Locale.default,*/ ...config }: CreateClientOptions): Client => {
    const contentProvider = shop.contentProvider as Partial<typeof shop.contentProvider>;
    if (!(contentProvider as any)) {
        throw new InvalidShopError("Shop doesn't have a content provider.");
    } else if (contentProvider.type !== 'prismic') {
        throw new InvalidContentProviderError(
            `"contentProvider.type" is "${contentProvider.type}", expected "prismic"`
        );
    }

    const repository = (contentProvider.repository || contentProvider.repositoryName)!;
    const accessToken = contentProvider.authentication?.token || undefined;

    if (accessToken) {
        // experimental_taintUniqueValue('Do not pass private tokens to the client', globalThis, accessToken);
    }

    const client = prismic.createClient(repository, {
        accessToken,
        routes,
        defaultParams: {
            //lang: locale.code // FIXME: We're making too many calls to the API.
            lang: Locale.default.code
        },
        ...config,
        fetchOptions: {
            cache: config.fetchOptions?.cache || 'no-store',
            next: {
                tags: ['prismic', `prismic.${shop.id}`, shop.domain /*, locale.code*/]
            }
        }
    });

    //enableAutoPreviews({ client });

    return client;
};

export const linkResolver: LinkResolverFunction<any> = (doc) => {
    // TODO: Deal with tenants that don't use locales in their paths.
    //const { code: locale } = Locale.from(doc.lang || Locale.default.code)!;

    if (doc.type === 'custom_page') {
        if (doc.uid === 'homepage') return `/`;
        else if (doc.uid === 'countries') return `/countries/`;
        else if (doc.uid === 'search') return `/search/`;
        else if (doc.uid === 'cart') return `/cart/`;
        else if (doc.uid === 'blogs') return `/blogs/`;
        // TODO: Handle pages with multi-level paths.
        else if (doc.uid) return `/${doc.uid}/`;
    } else if (doc.type === 'product_page') {
        return `/products/${doc.uid}/`;
    } else if (doc.type === 'collection_page') {
        return `/collections/${doc.uid}/`;
    } else if (doc.type === 'article_page') {
        return `/blogs/news/${doc.uid}/`;
    } else if (doc.type === 'cart_page') {
        return `/cart/`;
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
        type: 'cart_page',
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
        uid: 'blogs',
        path: '/:lang/blogs/news/'
    },
    {
        type: 'custom_page',
        path: '/:lang/blogs/news/:uid/'
    },
    {
        type: 'custom_page',
        path: '/:lang/:uid/'
    }
];
