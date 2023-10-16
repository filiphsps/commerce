import type { ClientConfig } from '@prismicio/client';
import { Config } from '@/utils/Config';
import type { CreateClientConfig } from '@prismicio/next';
import { enableAutoPreviews } from '@prismicio/next';
import { createClient as prismicCreateClient } from '@prismicio/client';

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
const routes: ClientConfig['routes'] = [
    {
        type: 'custom_page',
        uid: 'homepage',
        path: '/:lang?'
    },
    {
        type: 'custom_page',
        path: '/:lang?/countries'
    },
    {
        type: 'custom_page',
        path: '/:lang?/search'
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
export const createClient = (config: CreateClientConfig = {}) => {
    const client = prismicCreateClient(repositoryName, {
        routes,
        accessToken: accessToken || undefined,
        fetchOptions:
            process.env.NODE_ENV === 'production'
                ? { next: { tags: ['prismic'] }, cache: 'force-cache' }
                : { next: { revalidate: 5 } },
        ...config
    });

    enableAutoPreviews({
        client,
        previewData: config.previewData,
        req: config.req
    });

    return client;
};
