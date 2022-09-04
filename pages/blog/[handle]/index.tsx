import { ArticleApi, BlogApi } from '../../../src/api/blog';
import { NewsArticleJsonLd, NextSeo } from 'next-seo';
import React, { FunctionComponent } from 'react';

import Breadcrumbs from '../../../src/components/Breadcrumbs';
import LanguageString from '../../../src/components/LanguageString';
import Page from '../../../src/components/Page';
import PageContent from '../../../src/components/PageContent';
import PageHeader from '../../../src/components/PageHeader';
import { StoreModel } from '../../../src/models/StoreModel';
import styled from 'styled-components';

const Content = styled.div`
    overflow: hidden;
    font-size: 1.45rem;
    max-width: 78rem;
    background: #efefef;
    border-radius: var(--block-border-radius);
    padding: 2rem;

    a {
        color: var(--accent-primary);
        transition: 250ms;

        &:hover {
            color: var(--accent-primary-light);
        }
    }

    h2 {
        font-size: 2rem;
        font-weight: 600;
        line-height: 2.5rem;
        letter-spacing: 0.05rem;
        text-transform: uppercase;
    }
    h3 {
        font-size: 1.75rem;
        line-height: 2rem;
    }

    img {
        max-width: 100vw !important;
        object-fit: contain;
        mix-blend-mode: multiply;
    }
`;

interface ArticlePageProps {
    store: StoreModel;
    article: any;
}
const ArticlePage: FunctionComponent<ArticlePageProps> = (props) => {
    const { store, article } = props;

    return (
        <Page className="CartPage">
            <NextSeo
                title={article.seo.title || article.title}
                description={article.seo.description || article.excerpt}
            />
            <NewsArticleJsonLd
                url={`https://candybysweden.com/blog/${article.handle}`}
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
                            url: '/blog'
                        },
                        {
                            title: article.title,
                            url: `/blog/${article.handle}`
                        }
                    ]}
                    store={store}
                />

                <PageHeader
                    title={article.title}
                    plainTitle
                    subtitle={new Date(article.published_at).toDateString()}
                />

                <Content
                    dangerouslySetInnerHTML={{ __html: article.content_html }}
                />
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
    let errors = [];

    try {
        article = (await ArticleApi({ handle, locale })) as any;
    } catch (err) {
        console.warn(err);
        errors.push(err);
    }

    return {
        props: {
            article,
            errors
        },
        revalidate: 10
    };
}

export default ArticlePage;
