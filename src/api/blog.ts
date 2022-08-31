import { gql } from '@apollo/client';
import { newShopify } from './shopify';

export const BlogApi = async ({
    handle
}: {
    handle: string;
    locale?: string;
}) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data, errors } = await newShopify.query({
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
                            articles(first: 250) {
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
            result.articles = result.articles.edges.map((i) => ({
                id: i.node.id,
                handle: i.node.handle,
                title: i.node.title,
                excerpt: i.node.excerpt,
                published_at: i.node.publishedAt,

                image: {
                    url: i.node.image.url,
                    width: i.node.image.width,
                    height: i.node.image.height,
                    alt: i.node.image.altText
                }
            }));

            return resolve(result);
        } catch (err) {
            console.error(err);
            return reject(err);
        }
    });
};

export const ArticleApi = async ({
    handle
}: {
    handle: string;
    locale?: string;
}) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data, errors } = await newShopify.query({
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
                    blog: 'news'
                }
            });

            if (errors) throw errors;
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

                image: {
                    url: result.image.url,
                    width: result.image.width,
                    height: result.image.height,
                    alt: result.image.altText
                },
                seo: {
                    title: result.seo.title,
                    description: result.seo.description
                }
            });
        } catch (err) {
            console.error(err);
            return reject(err);
        }
    });
};
