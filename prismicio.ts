import * as prismic from '@prismicio/client';
import * as prismicNext from '@prismicio/next';

import { Config } from 'src/util/Config';

/**
 * The project's Prismic repository name.
 */
export const repositoryName = Config.prismic.name;
export const accessToken = process.env.PRISMIC_TOKEN;

/**
 * A list of Route Resolver objects that define how a document's `url` field
 * is resolved.
 *
 * {@link https://prismic.io/docs/route-resolver#route-resolver}
 */
const routes: prismic.ClientConfig['routes'] = [
    {
        type: 'custom_page',
        uid: 'homepage',
        path: '/:lang?'
    },
    {
        type: 'custom_page',
        path: '/:lang?/locales'
    },
    {
        type: 'product_page',
        path: '/:lang?/products/:uid'
    },
    {
        type: 'collection_page',
        path: '/:lang?/collections/:uid'
    },
    {
        type: 'custom_page',
        path: '/:lang?/:uid'
    }
];

/**
 * Creates a Prismic client for the project's repository. The client is used to
 * query content from the Prismic API.
 *
 * @param config - Configuration for the Prismic client.
 */
export const createClient = (config: prismicNext.CreateClientConfig = {}) => {
    const client = prismic.createClient(repositoryName, {
        routes,
        accessToken: accessToken,
        fetchOptions:
            process.env.NODE_ENV === 'production'
                ? { next: { tags: ['prismic'] }, cache: 'force-cache' }
                : { next: { revalidate: 5 } },
        ...config
    });

    prismicNext.enableAutoPreviews({
        client,
        previewData: config.previewData,
        req: config.req
    });

    return client;
};
