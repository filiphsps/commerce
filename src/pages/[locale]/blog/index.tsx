import type { GetStaticPaths, GetStaticProps } from 'next';

import { BlogApi } from '@/api/blog';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import Link from '@/components/link';
import type { StoreModel } from '@/models/StoreModel';
import { Config } from '@/utils/config';
import { NextLocaleToLocale } from '@/utils/locale';
import { AnalyticsPageType } from '@shopify/hydrogen-react';
import { NextSeo } from 'next-seo';
import dynamic from 'next/dynamic';
import Error from 'next/error';
import Image from 'next/legacy/image';
import { useRouter } from 'next/router';
import type { FunctionComponent } from 'react';
import styled from 'styled-components';

const Page = dynamic(() => import('@/components/Page'));
const PageContent = dynamic(() => import('@/components/PageContent'));
const PageHeader = dynamic(() => import('@/components/PageHeader'));

const Article = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--block-spacer);
    margin-bottom: var(--block-padding);
    padding: 0.5rem 0;
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
    margin: -0.15rem 0 0.25rem 0;
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
                    {blog.articles.map((article: any) => (
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

                <Breadcrumbs store={store} />
            </PageContent>
        </Page>
    );
};

export const getStaticPaths: GetStaticPaths = async ({}) => {
    const locales = Config.i18n.locales;

    let paths = [
        ...(
            locales?.map((locale) => ({
                params: { locale }
            })) || []
        ).filter((a) => a?.params?.locale)
    ];

    return { paths, fallback: 'blocking' };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
    const { locale: localeData } = params as { locale: string };
    const locale = NextLocaleToLocale(localeData);

    let blog: any = null;

    try {
        blog = (await BlogApi({
            handle: 'news', // FIXME: Configurable
            locale: locale.locale
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
    } catch (error: any) {
        if (error.message?.includes('404')) {
            return {
                props: {},
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
};

export default BlogPage;
