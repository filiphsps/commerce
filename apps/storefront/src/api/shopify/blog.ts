import { NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';

import { gql } from '@apollo/client';
import { flattenConnection } from '@shopify/hydrogen-react';

import type { Blog } from '@/api/blog';
import type { AbstractApi, ApiReturn } from '@/utils/abstract-api';
import type { Article, ArticleSortKeys, BlogConnection } from '@shopify/hydrogen-react/storefront-api-types';

export async function BlogsApi({ api }: { api: AbstractApi }): Promise<ApiReturn<Blog[]>> {
    const { data, errors } = await api.query<{ blogs: BlogConnection }>(
        gql`
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
        `,
        {
            first: 250
        }
    );

    if (errors && errors.length > 0) {
        return [undefined, new ProviderFetchError(errors)];
    }

    if (!data || data.blogs.edges.length <= 0) {
        return [undefined, new NotFoundError(`"Blogs" cannot be found`)];
    }

    return [flattenConnection(data.blogs), undefined];
}

export async function BlogApi({
    api,
    handle = 'news',
    limit = 30,
    sorting = 'PUBLISHED_AT',
    reverseSorting = true
}: {
    api: AbstractApi;
    handle?: string;
    limit?: number;
    sorting?: ArticleSortKeys;
    reverseSorting?: boolean;
}): Promise<ApiReturn<Blog>> {
    const { data, errors } = await api.query<{ blogByHandle: Blog & { description?: { value: string } } }>(
        gql`
            query blog($handle: String!, $first: Int!, $sorting: ArticleSortKeys!, $reverseSorting: Boolean!) {
                blogByHandle(handle: $handle) {
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

                                title
                                excerptHtml

                                image {
                                    url
                                    height
                                    width
                                    altText
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
        `,
        {
            handle,
            first: limit,
            sorting,
            reverseSorting
        }
    );

    if (errors && errors.length > 0) {
        return [undefined, new ProviderFetchError(errors)];
    }

    if (!data?.blogByHandle) {
        return [undefined, new NotFoundError(`"Blog" with handle "${handle}" cannot be found`)];
    }

    return [
        {
            ...data.blogByHandle,
            description: data.blogByHandle.description?.value
        },
        undefined
    ];
}

export async function BlogArticleApi({
    api,
    blogHandle = 'news',
    handle
}: {
    api: AbstractApi;
    blogHandle?: string;
    handle: string;
}): Promise<ApiReturn<Article>> {
    const shop = api.shop();

    const { data, errors } = await api.query<{ blogByHandle: Blog }>(
        gql`
            query article($blogHandle: String!, $handle: String!) {
                blogByHandle(handle: $blogHandle) {
                    articleByHandle(handle: $handle) {
                        id
                        handle
                        publishedAt

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
                            url
                            height
                            width
                            altText
                        }

                        authorV2 {
                            name
                            firstName
                            lastName
                            email
                            bio
                        }

                        blog {
                            title
                            handle
                        }
                    }
                }
            }
        `,
        {
            blogHandle,
            handle
        }
    );

    if (errors && errors.length > 0) {
        return [undefined, new ProviderFetchError(errors)];
    }

    if (!data?.blogByHandle) {
        return [undefined, new NotFoundError(`"Blog" with handle "${blogHandle}" on shop "${shop.id}"`)];
    } else if (!data.blogByHandle.articleByHandle) {
        return [undefined, new NotFoundError(`"articleByHandle" for blog "${handle}" on shop "${shop.id}"`)];
    }

    return [
        {
            ...data.blogByHandle.articleByHandle,
            contentHtml: data.blogByHandle.articleByHandle.contentHtml.replace(/data-mce-fragment="1"/gi, '')
        },
        undefined
    ];
}
