import type { AbstractApi } from '@/utils/abstract-api';
import { Blog } from '@shopify/hydrogen-react/storefront-api-types';
import { gql } from 'graphql-tag';

export const BlogApi = async ({ client, handle }: { client: AbstractApi; handle: string }): Promise<Blog> => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data, errors } = await client.query<{ blogByHandle: Blog }>(
                gql`
                    query blog($handle: String!) {
                        blogByHandle(handle: $handle) {
                            id
                            handle

                            title
                            seo {
                                title
                                description
                            }
                            articles(first: 250, reverse: true, sortKey: PUBLISHED_AT) {
                                edges {
                                    node {
                                        id
                                        handle

                                        title
                                        excerpt
                                        publishedAt

                                        image {
                                            url
                                            height
                                            width
                                            altText
                                        }
                                    }
                                }
                            }
                        }
                    }
                `,
                {
                    handle: handle
                }
            );

            if (errors) return reject(new Error(`500: ${new Error(errors.map((e: any) => e.message).join('\n'))}`));
            else if (!data?.blogByHandle)
                return reject(new Error(`404: "Blog" with handle "${handle}" cannot be found`));
            else if (!data.blogByHandle.articles)
                return reject(new Error(`404: "Articles" for blog "${handle}" cannot be found`));

            return resolve(data.blogByHandle);
        } catch (error: any) {
            console.error(error);
            return reject(error);
        }
    });
};
