import { ArticleApi, BlogApi } from '../../../src/api/blog';
import React, { FunctionComponent } from 'react';

import Breadcrumbs from '../../../src/components/Breadcrumbs';
import LanguageString from '../../../src/components/LanguageString';
import Link from 'next/link';
import { NextSeo } from 'next-seo';
import Page from '../../../src/components/Page';
import PageContent from '../../../src/components/PageContent';
import PageHeader from '../../../src/components/PageHeader';
import { StoreModel } from '../../../src/models/StoreModel';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import styled from 'styled-components';

const Content = styled.div`
    h3 {
        font-size: 1.75rem;
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
            <NextSeo title={article.title} />

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
                    hideSocial={true}
                />

                <PageHeader title={article.title} />

                <Content
                    dangerouslySetInnerHTML={{ __html: article.content }}
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

    let translation;
    let article: any = null;
    let errors = [];

    try {
        translation = await serverSideTranslations(locale ?? 'en-US', [
            'common',
            'product'
        ]);
    } catch (err) {
        console.error(err);
        errors.push(err);
    }

    try {
        article = (await ArticleApi({ handle, locale })) as any;
    } catch (err) {
        console.warn(err);
        errors.push(err);
    }

    return {
        props: {
            ...translation,
            article,
            errors
        },
        revalidate: 10
    };
}

export default ArticlePage;
