import { gql } from '@apollo/client';

import type { AbstractApi } from '@/utils/abstract-api';
import type { Article, ArticleSortKeys, Blog } from '@shopify/hydrogen-react/storefront-api-types';

export const BlogApi = async ({
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
}): Promise<Blog> => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data, errors } = await api.query<{ blogByHandle: Blog }>(
                gql`
                    query blog($handle: String!, $first: Int!, $sorting: ArticleSortKeys!, $reverseSorting: Boolean!) {
                        blogByHandle(handle: $handle) {
                            id
                            handle

                            title
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

            if (errors) return reject(new Error(`500: ${errors.map((e: any) => e.message).join('\n')}`));
            else if (!data?.blogByHandle)
                return reject(new Error(`404: "Blog" with handle "${handle}" cannot be found`));

            return resolve(data.blogByHandle);
        } catch (error: unknown) {
            return reject(error);
        }
    });
};

export const BlogArticleApi = async ({
    api,
    blogHandle = 'news',
    handle
}: {
    api: AbstractApi;
    blogHandle?: string;
    handle: string;
}): Promise<Article> => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data, errors } = await api.query<{ blogByHandle: Blog }>(
                gql`
                    query article($blogHandle: String!, $handle: String!) {
                        blogByHandle(handle: $blogHandle) {
                            articleByHandle(handle: $handle) {
                                id
                                handle
                                publishedAt

                                title
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
                                    firstName
                                    lastName
                                    email
                                    bio
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

            if (errors) return reject(new Error(`500: ${errors.map((e: any) => e.message).join('\n')}`));
            else if (!data?.blogByHandle)
                return reject(new Error(`404: "Blog" with handle "${blogHandle}" cannot be found`));
            else if (!data.blogByHandle.articleByHandle)
                return reject(new Error(`404: "articleByHandle" for blog "${handle}" cannot be found`));

            return resolve({
                ...data.blogByHandle.articleByHandle,
                contentHtml: data.blogByHandle.articleByHandle.contentHtml.replace(/data-mce-fragment="1"/gi, '')
            });
        } catch (error: unknown) {
            return reject(error);
        }
    });
};
