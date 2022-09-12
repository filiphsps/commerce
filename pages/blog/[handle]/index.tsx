import { ArticleApi, BlogApi } from '../../../src/api/blog';
import { NewsArticleJsonLd, NextSeo } from 'next-seo';
import React, { FunctionComponent } from 'react';

import Breadcrumbs from '../../../src/components/Breadcrumbs';
import { Config } from '../../../src/util/Config';
import LanguageString from '../../../src/components/LanguageString';
import Link from 'next/link';
import Page from '../../../src/components/Page';
import PageContent from '../../../src/components/PageContent';
import { StoreModel } from '../../../src/models/StoreModel';
import styled from 'styled-components';

const ContentWrapper = styled.div`
    display: grid;
    grid-template-columns: 1fr 32rem;
    gap: 4rem;

    @media (max-width: 950px) {
        grid-template-columns: 1fr;
        gap: 1rem;
    }
`;
const Content = styled.div`
    width: 100%;
    margin: 0px auto;
`;

const ArticleHeader = styled.div`
    margin-bottom: 2rem;
    padding-top: 1.5rem;
    border-top: 0.2rem solid #efefef;
`;
const ArticleTitle = styled.h1`
    max-width: 62rem;
    margin: 0px auto;
    text-transform: uppercase;
    font-size: 2.75rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
`;
const ArticleMeta = styled.div`
    max-width: 62rem;
    margin: 0px auto;
    color: #404756;
    font-size: 1.25rem;
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

const ArticleContent = styled.div`
    max-width: 62rem;
    overflow: hidden;
    font-weight: 400;
    margin: 0px auto;

    p {
        font-size: 1.5rem;
        margin-bottom: 1.5rem;
    }

    a {
        color: var(--accent-primary);
        transition: 150ms ease-in-out;

        &:hover {
            color: var(--accent-primary-light);
            text-decoration: underline;
        }
    }

    h1 {
        margin-bottom: 1rem;
        font-size: 2.5rem;
        font-weight: 600;
        line-height: 3rem;
        letter-spacing: 0.05rem;
        text-transform: uppercase;
    }
    h2 {
        margin-bottom: 1rem;
        font-size: 2rem;
        font-weight: 600;
        line-height: 2.75rem;
        letter-spacing: 0.05rem;
        text-transform: uppercase;
    }
    h3 {
        margin-bottom: 1rem;
        font-size: 1.75rem;
        line-height: 2.5rem;
        line-height: 2rem;
    }
    h4 {
        margin-bottom: 1rem;
        font-size: 1.5rem;
        line-height: 2rem;
        line-height: 2rem;
    }

    img {
        margin: 2rem 0px;
        max-width: 100% !important;
        object-fit: contain;
        mix-blend-mode: multiply;
    }
`;

const Sidebar = styled.div`
    position: relative;
    width: 100%;
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
}
const ArticlePage: FunctionComponent<ArticlePageProps> = (props) => {
    const { store, article, blog } = props;

    return (
        <Page className="ArticlePage">
            <NextSeo
                title={article.seo.title || article.title}
                description={article.seo.description || article.excerpt}
            />
            <NewsArticleJsonLd
                url={`https://${Config.domain}/blog/${article.handle}`}
                description={article.seo.description || article.excerpt}
                body={article.content}
                title={article.title}
                section="news"
                images={[]}
                keywords={article.tags}
                dateCreated={article.published_at}
                datePublished={article.published_at}
                authorName={article.author.name}
                publisherName="Candy by Sweden"
                publisherLogo=""
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
                            <ArticleTitle>{article.title}</ArticleTitle>
                            <ArticleMeta>
                                <ArticleAuthor>
                                    by {article.author.name}
                                </ArticleAuthor>
                                <ArticleDate>
                                    {new Date(
                                        article.published_at
                                    ).toDateString()}
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
                                    <Link href={`/blog/${article.handle}`}>
                                        <a>{article.title}</a>
                                    </Link>
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

export async function getStaticPaths() {
    const blog: any = await BlogApi({ handle: 'news' });

    let paths = [
        ...blog.articles
            ?.map((article) => ({
                params: { handle: article?.handle }
            }))
            .filter((a) => a.params.handle)
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
    let errors = [];

    try {
        article = (await ArticleApi({ handle, blog: 'news', locale })) as any;
    } catch (err) {
        console.warn(err);
        if (err) errors.push(err);
    }
    try {
        blog = (await BlogApi({ handle: 'news', locale })) as any;
    } catch (err) {
        console.warn(err);
        if (err) errors.push(err);
    }

    return {
        props: {
            article,
            blog,
            errors
        },
        revalidate: 10
    };
}

export default ArticlePage;
