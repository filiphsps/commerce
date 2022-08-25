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
                published_at: i.node.publishedAt
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
                                contentHtml
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
                content: result.contentHtml
            });
        } catch (err) {
            console.error(err);
            return reject(err);
        }
    });
};
