import React, { FunctionComponent } from 'react';

import { BlogApi } from '../../src/api/blog';
import Breadcrumbs from '../../src/components/Breadcrumbs';
import Image from 'next/image';
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
    grid-gap: 2rem;
    padding-bottom: 2rem;
    cursor: pointer;

    @media (min-width: 950px) {
        max-width: 64rem;
    }

    h2 {
        font-size: 2rem;
        padding-bottom: 0.5rem;
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
    opacity: 0.85;
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
        <Page className="BlogPage">
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
                        <Link key={article.id} href={`/blog/${article.handle}`}>
                            <Article>
                                <ArticleImage>
                                    <Image
                                        src={article.image.url}
                                        layout="fill"
                                    />
                                </ArticleImage>
                                <div>
                                    <h2>{article.title}</h2>
                                    <ArticleDate>
                                        {new Date(
                                            article.published_at
                                        ).toDateString()}
                                    </ArticleDate>
                                    <ArticleContent>
                                        {article.excerpt}
                                    </ArticleContent>
                                </div>
                            </Article>
                        </Link>
                    ))}
                </div>
            </PageContent>
        </Page>
    );
};

export async function getStaticProps({ params, locale }) {
    let blog: any = null;
    let errors = [];

    try {
        blog = (await BlogApi({ handle: 'news', locale })) as any;
    } catch (err) {
        console.warn(err);
        errors.push(err);
    }

    return {
        props: {
            blog,
            errors
        },
        revalidate: 10
    };
}

export default BlogPage;
