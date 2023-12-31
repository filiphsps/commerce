import type { Client, ClientConfig, LinkResolverFunction } from '@prismicio/client';

import type { Shop } from '@/api/shop';
import { BuildConfig } from '@/utils/build-config';
import { TodoError } from '@/utils/errors';
import { Locale } from '@/utils/locale';
import { createClient as prismicCreateClient } from '@prismicio/client';
import type { CreateClientConfig } from '@prismicio/next';
import { enableAutoPreviews } from '@prismicio/next';

/**
 * The project's Prismic repository name.
 *
 * @deprecated
 */
export const repositoryName = BuildConfig.prismic?.name || '';
/** @deprecated */
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
export const createClient = ({
    shop,
    locale,
    ...config
}: CreateClientConfig & { shop: Shop; locale: Locale }): Client => {
    const defaultTags = ['prismic', `prismic.${shop.id}`];
    // TODO: Remove `repositoryName` variable.
    let name: string = repositoryName;

    // TODO: These cases should be dealt with before even arriving here.
    if (shop.contentProvider?.type !== 'prismic') {
        // TODO: Deal with the `shopify` content provider.
        throw new TodoError();
    } else {
        // Work-around since `content.id` wouldn't exist on a `DummyContentProvider`.
        name = /*shop.configuration.content?.id ||*/ repositoryName;
    }

    // TODO: Remove `repositoryName` variable.
    const client = prismicCreateClient(name, {
        routes,
        accessToken: accessToken || undefined,
        fetchOptions: {
            cache: process.env.NODE_ENV === 'production' ? 'force-cache' : 'default',
            next: { tags: defaultTags }
        },
        defaultParams: {
            lang: locale.code!
        },
        ...config
    });

    enableAutoPreviews({
        client,
        ...config
    });

    return client;
};

export const linkResolver: LinkResolverFunction<any> = (doc) => {
    const { code: locale } = Locale.from(doc.lang)!; // FIXME: handle invalid locales.

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
