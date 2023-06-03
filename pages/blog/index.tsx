import * as Sentry from '@sentry/nextjs';

import React, { FunctionComponent } from 'react';

import { BlogApi } from '../../src/api/blog';
import Breadcrumbs from '../../src/components/Breadcrumbs';
import { Config } from '../../src/util/Config';
import Error from 'next/error';
import Image from 'next/legacy/image';
import LanguageString from '../../src/components/LanguageString';
import Link from 'next/link';
import { NextSeo } from 'next-seo';
import Page from '../../src/components/Page';
import PageContent from '../../src/components/PageContent';
import PageHeader from '../../src/components/PageHeader';
import { StoreModel } from '../../src/models/StoreModel';
import styled from 'styled-components';

const Article = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    grid-gap: 1rem;
    margin-bottom: 1rem;
    padding: 0.5rem 0px;
    cursor: pointer;
    border: 0.2rem solid #efefef;
    border-left: none;
    border-right: none;

    @media (min-width: 950px) {
        max-width: 64rem;
    }

    h2 {
        padding-bottom: 0.5rem;
        font-size: 2rem;
        font-weight: 600;
        text-transform: uppercase;
        transition: 150ms ease-in-out;

        &:hover {
            color: var(--accent-primary);
        }
    }
`;
const ArticleImage = styled.div`
    position: relative;
    overflow: hidden;
    height: 12rem;
    width: 12rem;
    border-radius: var(--block-border-radius);
    background: #efefef;

    img {
        mix-blend-mode: multiply;
        object-fit: cover;
        height: 100%;
        width: 100%;
    }
`;
const ArticleDate = styled.div`
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: 0.05rem;
    margin: -0.15rem 0px 0.25rem 0px;
    text-transform: uppercase;
    opacity: 0.75;
`;
const ArticleContent = styled.div`
    font-size: 1.5rem;
`;

interface BlogPageProps {
    store: StoreModel;
    blog: any;
    error?: string;
}
const BlogPage: FunctionComponent<BlogPageProps> = ({ store, blog, error }) => {
    if (error || !blog) return <Error statusCode={500} title={error} />;

    return (
        <Page className="BlogPage">
            <NextSeo title="Blog" canonical={`https://${Config.domain}/blog/`} />

            <PageContent>
                <Breadcrumbs
                    pages={[
                        {
                            title: <LanguageString id={'blog'} />,
                            url: '/blog'
                        }
                    ]}
                    store={store}
                    hideSocial={true}
                />

                <PageHeader title={blog.title} />

                <div>
                    {blog.articles.map((article) => (
                        <Link key={article.id} href={`/blog/${article.handle}`}>
                            <Article>
                                <ArticleImage>
                                    <Image src={article.image.url} layout="fill" />
                                </ArticleImage>
                                <div>
                                    <h2>{article.title}</h2>
                                    <ArticleDate>
                                        {new Date(article.published_at).toDateString()}
                                    </ArticleDate>
                                    <ArticleContent>{article.excerpt}</ArticleContent>
                                </div>
                            </Article>
                        </Link>
                    ))}
                </div>
            </PageContent>
        </Page>
    );
};

export async function getStaticProps({ locale }) {
    let blog: any = null;

    try {
        blog = (await BlogApi({
            handle: 'news', // FIXME: Configurable
            locale
        })) as any;

        return {
            props: {
                blog,
                analytics: {
                    pageType: 'blog'
                }
            },
            revalidate: 60
        };
    } catch (error) {
        if (error.message?.includes('404')) {
            return {
                props: null,
                revalidate: 60
            };
        }

        Sentry.captureException(error);
        return {
            props: {
                error: error.message
            },
            revalidate: 10
        };
    }
}

export default BlogPage;
