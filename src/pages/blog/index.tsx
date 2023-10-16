import { AnalyticsPageType } from '@shopify/hydrogen-react';
import { BlogApi } from '@/api/blog';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Config } from '@/utils/Config';
import Error from 'next/error';
import type { FunctionComponent } from 'react';
import Image from 'next/legacy/image';
import Link from 'next/link';
import { NextSeo } from 'next-seo';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PageHeader from '@/components/PageHeader';
import type { StoreModel } from '@/models/StoreModel';
import styled from 'styled-components';
import { useRouter } from 'next/router';

const Article = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--block-spacer);
    margin-bottom: var(--block-padding);
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
        transition: 250ms ease-in-out;

        @media (hover: hover) and (pointer: fine) {
            &:hover {
                color: var(--accent-primary);
            }
        }
    }
`;
const ArticleImage = styled.div`
    position: relative;
    overflow: hidden;
    height: 12rem;
    width: 12rem;
    border-radius: var(--block-border-radius);
    background: var(--color-block);

    img {
        object-fit: cover;
        height: 100%;
        width: 100%;
    }
`;
const ArticleDate = styled.div`
    font-size: 1.25rem;
    font-weight: 600;
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
    const router = useRouter();
    if (error || !blog) return <Error statusCode={500} title={error} />;

    return (
        <Page className="BlogPage">
            <NextSeo
                title="Blog"
                canonical={`https://${Config.domain}/${router.locale}/blog/`}
                languageAlternates={
                    router.locales?.map((locale) => ({
                        hrefLang: locale,
                        href: `https://${Config.domain}/${(locale !== 'x-default' && `${locale}/`) || ''}blog/`
                    })) || []
                }
            />

            <PageContent primary>
                <PageHeader title={blog.title} />

                <div>
                    {blog.articles.map((article) => (
                        <Link key={article.id} href={`/blog/${article.handle}/`}>
                            <Article>
                                <ArticleImage>
                                    <Image src={article.image.url} layout="fill" />
                                </ArticleImage>
                                <div>
                                    <h2>{article.title}</h2>
                                    <ArticleDate>{new Date(article.published_at).toDateString()}</ArticleDate>
                                    <ArticleContent>{article.excerpt}</ArticleContent>
                                </div>
                            </Article>
                        </Link>
                    ))}
                </div>

                <Breadcrumbs
                    pages={[
                        {
                            title: 'Blog',
                            url: '/blog'
                        }
                    ]}
                    store={store}
                />
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
                    pageType: AnalyticsPageType.blog,
                    resourceId: blog?.id || ''
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

        console.error(error);
        return {
            props: {
                error: error.message
            },
            revalidate: 10
        };
    }
}

export default BlogPage;
