import { gql } from 'graphql-tag';
import { storefrontClient } from './shopify';

export const BlogApi = async ({ handle }: { handle: string; locale?: string }) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data, errors } = await storefrontClient.query({
                query: gql`
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
                variables: {
                    handle: handle
                }
            });

            if (errors) throw errors;
            let result = data.blogByHandle;
            result.articles = result.articles.edges.map((article: any) => ({
                id: article.node.id,
                handle: article.node.handle,
                title: article.node.title,
                excerpt: article.node.excerpt,
                published_at: article.node.publishedAt,

                image:
                    (article.node.image && {
                        url: article.node.image.url,
                        width: article.node.image.width,
                        height: article.node.image.height,
                        alt: article.node.image.altText
                    }) ||
                    null
            }));

            return resolve(result);
        } catch (error) {
            console.error(error);
            return reject(error);
        }
    });
};

export const ArticleApi = async ({ handle, blog }: { handle: string; blog: string; locale?: string }) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data, errors } = await storefrontClient.query({
                query: gql`
                    query blog($blog: String!) {
                        blogByHandle(handle: $blog) {
                            id
                            handle

                            title
                            seo {
                                title
                                description
                            }
                            articleByHandle(handle: "${handle}") {
                                id
                                handle

                                title
                                excerpt
                                content
                                contentHtml
                                publishedAt
                                tags

                                authorV2 {
                                    name
                                    email
                                    bio
                                }

                                image {
                                    url
                                    height
                                    width
                                    altText
                                }

                                seo {
                                    title
                                    description
                                }
                            }
                        }
                    }
                `,
                variables: {
                    blog: blog || 'news'
                }
            });

            if (errors) return reject(new Error(errors.join('\n')));
            if (!data?.blogByHandle?.articleByHandle)
                return reject(new Error('404: The requested document cannot be found'));

            let result = data.blogByHandle.articleByHandle;
            return resolve({
                id: result.id,
                handle: result.handle,

                title: result.title,
                excerpt: result.excerpt,
                content: result.content,
                content_html: result.contentHtml,
                published_at: result.publishedAt,
                tags: result.tags,

                author: {
                    name: result.authorV2.name,
                    bio: result.authorV2.bio
                },

                image:
                    (result.image && {
                        url: result.image.url,
                        width: result.image.width,
                        height: result.image.height,
                        alt: result.image.altText
                    }) ||
                    null,
                seo: {
                    title: result.seo.title,
                    description: result.seo.description
                }
            });
        } catch (error) {
            console.error(error);
            return reject(error);
        }
    });
};
