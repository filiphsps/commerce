import type { Client, ClientConfig, LinkResolverFunction } from '@prismicio/client';

import { BuildConfig } from '@/utils/build-config';
import type { CreateClientConfig } from '@prismicio/next';
import type { Locale } from '@/utils/locale';
import { NextLocaleToLocale } from '@/utils/locale';
import { enableAutoPreviews } from '@prismicio/next';
import { createClient as prismicCreateClient } from '@prismicio/client';

/**
 * The project's Prismic repository name.
 */
export const repositoryName = BuildConfig.prismic.name;
export const accessToken = process.env.PRISMIC_TOKEN;

/**
 * A list of Route Resolver objects that define how a document's `url` field
 * is resolved.
 *
 * {@link https://prismic.io/docs/route-resolver#route-resolver}
 */
const routes: ClientConfig['routes'] = [
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

/**
 * Creates a Prismic client for the project's repository. The client is used to
 * query content from the Prismic API.
 *
 * @param {CreateClientConfig} config - Configuration for the Prismic client.
 * @returns {Client} A Prismic client.
 */
export const createClient = (config: CreateClientConfig & { locale?: Locale } = {}): Client => {
    const client = prismicCreateClient(repositoryName, {
        routes,
        accessToken: accessToken || undefined,
        fetchOptions:
            process.env.NODE_ENV === 'production'
                ? { next: { tags: ['prismic'] }, cache: 'force-cache' }
                : { next: { revalidate: 5 } },
        defaultParams: {
            lang: config.locale?.locale
        },
        ...config
    });

    enableAutoPreviews({
        client,
        previewData: config.previewData,
        req: config.req
    });

    return client;
};

export const linkResolver: LinkResolverFunction<any> = (doc) => {
    const locale = NextLocaleToLocale(doc.lang)!; // FIXME: handle invalid locales.

    if (doc.type === 'custom_page') {
        if (doc.uid === 'homepage') return `/${locale.locale}/`;
        else if (doc.uid === 'countries') return `/${locale.locale}/countries/`;
        else if (doc.uid === 'search') return `/${locale.locale}/search/`;
        else if (doc.uid === 'cart') return `/${locale.locale}/cart/`;
        else if (doc.uid === 'blog') return `/${locale.locale}/blog/`;
        // TODO: Handle pages with multi-level paths.
        else if (doc.uid) return `/${locale.locale}/${doc.uid}/`;
    } else if (doc.type === 'product_page') {
        return `/${locale.locale}/products/${doc.uid}/`;
    } else if (doc.type === 'collection_page') {
        return `/${locale.locale}/collection/${doc.uid}/`;
    }

    return null;
};
