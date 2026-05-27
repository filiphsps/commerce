import { NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { graphql } from '@nordcom/commerce-shopify-graphql/graphql';
import { flattenConnection } from '@shopify/hydrogen-react';
import type { Article, ArticleSortKeys } from '@shopify/hydrogen-react/storefront-api-types';
import type { Blog } from '@/api/blog';
import type { AbstractApi, ApiReturn } from '@/utils/abstract-api';
import { unsafe_cast } from '@/utils/unsafe-cast';

const BLOGS_QUERY = graphql(`
    query blogs($first: Int!) {
        blogs(first: $first) {
            edges {
                node {
                    id
                    handle
                    title
                    seo {
                        title
                        description
                    }
                    authors {
                        name
                        email
                        bio
                    }
                }
            }
        }
    }
`);

const BLOG_QUERY = graphql(`
    query blog($handle: String!, $first: Int!, $sorting: ArticleSortKeys!, $reverseSorting: Boolean!) {
        blog(handle: $handle) {
            id
            handle
            title
            description: metafield(namespace: "nordcom-commerce", key: "description") {
                value
            }
            seo {
                title
                description
            }
            articles(first: $first, sortKey: $sorting, reverse: $reverseSorting) {
                edges {
                    node {
                        id
                        handle
                        publishedAt
                        trackingParameters
                        title
                        excerptHtml
                        image {
                            id
                            url
                            height
                            width
                            altText
                            thumbhash
                        }
                        authorV2 {
                            name
                            email
                        }
                    }
                }
            }
        }
    }
`);

const BLOG_ARTICLE_QUERY = graphql(`
    query article($blogHandle: String!, $handle: String!) {
        blog(handle: $blogHandle) {
            articleByHandle(handle: $handle) {
                id
                handle
                publishedAt
                trackingParameters
                title
                content
                contentHtml
                excerpt
                excerptHtml
                tags
                seo {
                    title
                    description
                }
                image {
                    id
                    url
                    height
                    width
                    altText
                    thumbhash
                }
                authorV2 {
                    name
                    firstName
                    lastName
                    email
                    bio
                }
                blog {
                    id
                    title
                    handle
                }
            }
        }
    }
`);

/**
 * Fetches the list of all blogs from the Shopify Storefront API.
 *
 * @param options - Options object.
 * @param options.api - Storefront API client.
 * @returns A result tuple — `[Blog[], undefined]` on success or `[undefined, error]` on failure.
 */
export async function BlogsApi({ api }: { api: AbstractApi }): Promise<ApiReturn<Blog[]>> {
    const { data, errors } = await api.query(BLOGS_QUERY, { first: 250 });

    if (errors && errors.length > 0) {
        return [undefined, new ProviderFetchError(errors)];
    }

    if (!data || data.blogs.edges.length <= 0) {
        return [undefined, new NotFoundError(`"Blogs" cannot be found`)];
    }

    // flattenConnection returns RecursivePartial<Blog>[]; the Storefront API
    // guarantees all queried fields are present at runtime.
    return [unsafe_cast<Blog[]>(flattenConnection(data.blogs)), undefined];
}

/**
 * Fetches a single blog and its articles from the Shopify Storefront API.
 *
 * @param options - Options object.
 * @param options.api - Storefront API client.
 * @param options.handle - Blog handle to fetch; defaults to `"news"`.
 * @param options.limit - Max articles to include; defaults to `30`.
 * @param options.sorting - Article sort key; defaults to `"PUBLISHED_AT"`.
 * @param options.reverseSorting - Whether to reverse the sort order; defaults to `true`.
 * @returns A result tuple — `[Blog, undefined]` on success or `[undefined, error]` on failure.
 */
export async function BlogApi({
    api,
    handle = 'news',
    limit = 30,
    sorting = 'PUBLISHED_AT',
    reverseSorting = true,
}: {
    api: AbstractApi;
    handle?: string;
    limit?: number;
    sorting?: ArticleSortKeys;
    reverseSorting?: boolean;
}): Promise<ApiReturn<Blog>> {
    const { data, errors } = await api.query(BLOG_QUERY, {
        handle,
        first: limit,
        sorting,
        reverseSorting,
    });

    if (errors && errors.length > 0) {
        return [undefined, new ProviderFetchError(errors)];
    }

    if (!data?.blog) {
        return [undefined, new NotFoundError(`"Blog" with handle "${handle}" cannot be found`)];
    }

    return [
        {
            // hydrogen-react types `blog` as RecursivePartial<Blog>; the
            // Storefront API guarantees all queried fields are present.
            ...unsafe_cast<Blog>(data.blog),
            description: data.blog.description?.value,
        },
        undefined,
    ];
}

/**
 * Fetches a single blog article from the Shopify Storefront API.
 *
 * @param options - Options object.
 * @param options.api - Storefront API client.
 * @param options.blogHandle - Blog handle containing the article; defaults to `"news"`.
 * @param options.handle - Article handle to fetch.
 * @returns A result tuple — `[Article, undefined]` on success or `[undefined, error]` on failure.
 */
export async function BlogArticleApi({
    api,
    blogHandle = 'news',
    handle,
}: {
    api: AbstractApi;
    blogHandle?: string;
    handle: string;
}): Promise<ApiReturn<Article>> {
    const shop = api.shop();

    const { data, errors } = await api.query(BLOG_ARTICLE_QUERY, {
        blogHandle,
        handle,
    });

    if (errors && errors.length > 0) {
        return [undefined, new ProviderFetchError(errors)];
    }

    if (!data?.blog) {
        return [undefined, new NotFoundError(`"Blog" with handle "${blogHandle}" on shop "${shop.id}"`)];
    } else if (!data.blog.articleByHandle) {
        return [undefined, new NotFoundError(`"articleByHandle" for blog "${handle}" on shop "${shop.id}"`)];
    }

    return [
        {
            // hydrogen-react types `articleByHandle` as RecursivePartial<Article>;
            // the Storefront API guarantees all queried fields are present.
            ...unsafe_cast<Article>(data.blog.articleByHandle),
            contentHtml: data.blog.articleByHandle.contentHtml.replace(/data-mce-fragment="1"/gi, ''),
        },
        undefined,
    ];
}
