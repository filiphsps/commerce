import React, { FunctionComponent } from 'react';

import { BlogApi } from '../../src/api/blog';
import Breadcrumbs from '../../src/components/Breadcrumbs';
import LanguageString from '../../src/components/LanguageString';
import Link from 'next/link';
import { NextSeo } from 'next-seo';
import Page from '../../src/components/Page';
import PageContent from '../../src/components/PageContent';
import PageHeader from '../../src/components/PageHeader';
import { StoreModel } from '../../src/models/StoreModel';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import styled from 'styled-components';

const Article = styled.div`
    h2 {
        cursor: pointer;
        font-size: 2rem;
        padding-bottom: 0.5rem;
    }
`;
const ArticleContent = styled.div`
    font-size: 1.5rem;
`;

interface BlogPageProps {
    store: StoreModel;
    blog: any;
}
const BlogPage: FunctionComponent<BlogPageProps> = (props) => {
    const { store, blog } = props;

    return (
        <Page className="CartPage">
            <NextSeo title="Blog" />

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
                        <Article key={article.id}>
                            <Link href={`/blog/${article.handle}`}>
                                <h2>{article.title}</h2>
                            </Link>
                            <ArticleContent>{article.excerpt}</ArticleContent>
                        </Article>
                    ))}
                </div>
            </PageContent>
        </Page>
    );
};

export async function getStaticProps({ params, locale }) {
    let translation;
    let blog: any = null;
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
        blog = (await BlogApi({ handle: 'news', locale })) as any;
    } catch (err) {
        console.warn(err);
        errors.push(err);
    }

    return {
        props: {
            ...translation,
            blog,
            errors
        },
        revalidate: 10
    };
}

export default BlogPage;
