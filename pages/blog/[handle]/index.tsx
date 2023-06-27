import * as Sentry from '@sentry/nextjs';

import { ArticleApi, BlogApi } from '../../../src/api/blog';
import { NewsArticleJsonLd, NextSeo } from 'next-seo';
import React, { FunctionComponent } from 'react';

import Breadcrumbs from '../../../src/components/Breadcrumbs';
import { Config } from '../../../src/util/Config';
import ContentComponent from '../../../src/components/Content';
import Error from 'next/error';
import Image from 'next/legacy/image';
import LanguageString from '../../../src/components/LanguageString';
import Link from 'next/link';
import Page from '../../../src/components/Page';
import PageContent from '../../../src/components/PageContent';
import { StoreModel } from '../../../src/models/StoreModel';
import styled from 'styled-components';
import { useRouter } from 'next/router';

const ContentWrapper = styled.div`
    display: grid;
    grid-template-columns: 1fr 32rem;
    gap: 4rem;

    @media (max-width: 950px) {
        grid-template-columns: 1fr;
        gap: 2rem;
    }
`;
const Content = styled.article`
    width: 100%;
    margin: 0px auto 1.5rem auto;
`;

const Banner = styled.div`
    position: relative;
    width: 100%;
    height: 18rem;
    margin: 0px auto 1rem auto;

    img {
        object-fit: cover;
    }
`;

const ArticleHeader = styled.div`
    margin-bottom: 3rem;
    padding: 0.5rem 0px 1rem 0px;
    border-bottom: 0.2rem solid #efefef;
`;
const ArticleTitle = styled.h1`
    margin: 0px auto;
    text-transform: uppercase;
    font-size: 3.25rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
`;
const ArticleMeta = styled.div`
    text-transform: uppercase;
    margin: 0px auto;
    color: #404756;
    font-size: 1.25rem;
    font-weight: 600;
    font-size: 2rem;
`;
const ArticleAuthor = styled.div``;
const ArticleDate = styled.div``;

const ArticleTags = styled.div`
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
`;
const ArticleTag = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 2rem;
    padding: 1rem 0.5rem;
    text-transform: uppercase;
    background: #efefef;
`;

const ArticleContent = styled(ContentComponent)`
    width: 100%;
    overflow: hidden;
    font-weight: 400;
    margin: 0px auto;

    &::first-letter {
        color: var(--accent-primary-dark);
        initial-letter: 2;
        font-weight: 700;
        padding: 0px 1rem 0.25rem 0px;
    }
`;

const Sidebar = styled.div`
    position: relative;
    width: 100%;

    @media (max-width: 950px) {
        border-top: 0.2rem solid #efefef;
        padding-top: 2rem;
    }
`;
const SidebarContent = styled.div`
    position: sticky;
    top: 10rem;
`;
const SidebarTitle = styled.div`
    text-transform: uppercase;
    font-weight: 700;
    font-size: 1.25rem;
    letter-spacing: 0.05rem;
`;
const SidebarLink = styled.div`
    width: 100%;
    text-transform: uppercase;
    font-size: 1.5rem;
    margin: 1rem 0px;
    padding: 0px 0px 0.5rem 0px;
    border-bottom: 0.2rem solid #efefef;
    transition: 150ms ease-in-out;

    a:hover {
        color: var(--accent-primary);
        text-decoration: underline;
    }
`;

interface ArticlePageProps {
    store: StoreModel;
    article: any;
    blog: any;
    error?: string;
}
const ArticlePage: FunctionComponent<ArticlePageProps> = ({ store, article, blog, error }) => {
    const router = useRouter();
    if (error || !article) return <Error statusCode={500} title={error} />;

    return (
        <Page className="ArticlePage">
            <NextSeo
                title={article.seo.title || article.title}
                description={article.seo.description || article.excerpt}
                canonical={`https://${Config.domain}/${router.locale}/blog/${article.handle}/`}
                languageAlternates={
                    router?.locales
                        ?.filter((locale) => locale !== 'x-default')
                        .map((locale) => ({
                            hrefLang: locale,
                            href:
                                (locale !== 'x-default' &&
                                    `https://${Config.domain}/${locale}/blog/${article.handle}/`) ||
                                `https://${Config.domain}/blog/${article.handle}/`
                        })) || []
                }
                openGraph={{
                    url: `https://${Config.domain}/${router.locale}/blog/${article.handle}/`,
                    locale: router.locale,
                    type: 'article',
                    title: article.seo.title || article.title,
                    description: article.seo.description || article.excerpt,
                    article: {
                        publishedTime: article.published_at,
                        section: 'Life-Style',
                        authors: [article.author.name],
                        tags: article.tags
                    },
                    images: [
                        {
                            url: article.image.url
                        }
                    ],
                    site_name: store.name
                }}
            />
            <NewsArticleJsonLd
                url={`https://${Config.domain}/blog/${article.handle}`}
                description={article.seo.description || article.excerpt}
                body={article.content}
                title={article.title}
                section="news"
                images={[article.image.url]}
                keywords={article.tags}
                dateCreated={article.published_at}
                datePublished={article.published_at}
                authorName={article.author.name}
                publisherName="Candy by Sweden"
                publisherLogo={store.favicon.src}
            />

            <PageContent>
                <Breadcrumbs
                    pages={[
                        {
                            title: <LanguageString id={'blog'} />,
                            url: '/blog/'
                        },
                        {
                            title: article.title,
                            url: `/blog/${article.handle}/`
                        }
                    ]}
                    store={store}
                />

                <ContentWrapper>
                    <Content>
                        <ArticleHeader>
                            {(article.image && (
                                <Banner>
                                    <Image
                                        src={article.image.url}
                                        alt={article.image.alt || ''}
                                        layout="fill"
                                    />
                                </Banner>
                            )) ||
                                null}

                            <ArticleTitle>{article.title}</ArticleTitle>

                            <ArticleMeta>
                                <ArticleAuthor>by {article.author.name}</ArticleAuthor>
                                <ArticleDate>
                                    {new Date(article.published_at).toDateString()}
                                </ArticleDate>
                            </ArticleMeta>
                        </ArticleHeader>

                        <ArticleContent
                            dangerouslySetInnerHTML={{
                                __html: article.content_html
                            }}
                        />
                    </Content>
                    <Sidebar>
                        <SidebarContent>
                            <SidebarTitle>Latest Articles</SidebarTitle>
                            {blog.articles.map((article) => (
                                <SidebarLink key={article.id}>
                                    <Link href={`/blog/${article.handle}`}>{article.title}</Link>
                                </SidebarLink>
                            ))}

                            <SidebarTitle>Tags</SidebarTitle>
                            <ArticleTags>
                                {article.tags.map((tag) => (
                                    <ArticleTag key={tag}>{tag}</ArticleTag>
                                ))}
                            </ArticleTags>
                        </SidebarContent>
                    </Sidebar>
                </ContentWrapper>
            </PageContent>
        </Page>
    );
};

export async function getStaticPaths({ locales }) {
    const blog: any = await BlogApi({ handle: 'news' });

    let paths = [
        ...blog.articles
            ?.map((article) => [
                {
                    params: { handle: article?.handle }
                },
                ...locales.map((locale) => ({
                    params: { handle: article?.handle },
                    locale: locale
                }))
            ])
            .flat()
            .filter((a) => a?.params?.handle)
    ];

    return { paths, fallback: 'blocking' };
}

export async function getStaticProps({ params, locale }) {
    let handle = '';
    if (Array.isArray(params.handle)) {
        handle = params?.handle?.join('');
    } else {
        handle = params?.handle;
    }

    if (handle === 'undefined')
        return {
            revalidate: false
        };

    let article: any = null;
    let blog: any = null;

    try {
        article = (await ArticleApi({
            handle,
            blog: 'news',
            locale
        })) as any;
    } catch (error) {
        if (error.message?.includes('404')) {
            return {
                notFound: true
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

    try {
        blog = (await BlogApi({
            handle: 'news',
            locale
        })) as any;
    } catch (error) {
        Sentry.captureException(error);
    }

    return {
        props: {
            article,
            blog,
            analytics: {
                pageType: 'article'
            }
        },
        revalidate: 60
    };
}

export default ArticlePage;
