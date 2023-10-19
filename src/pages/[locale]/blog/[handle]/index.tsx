import { ArticleApi, BlogApi } from '@/api/blog';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { NewsArticleJsonLd, NextSeo } from 'next-seo';

import { AnalyticsPageType } from '@shopify/hydrogen-react';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { Config } from '@/utils/Config';
import ContentComponent from '@/components/Content';
import Error from 'next/error';
import type { FunctionComponent } from 'react';
import Image from 'next/legacy/image';
import Link from '@/components/link';
import { NextLocaleToLocale } from '@/utils/Locale';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import type { StoreModel } from '@/models/StoreModel';
import { isValidHandle } from '@/utils/handle';
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
    margin: 0 auto 1.5rem auto;
`;

const Banner = styled.div`
    overflow: hidden;
    position: relative;
    width: 100%;
    height: 18rem;
    margin: 0 auto var(--block-padding) auto;
    border-radius: var(--block-border-radius);

    img {
        object-fit: cover;
    }
`;

const ArticleHeader = styled.div`
    margin-bottom: 3rem;
    padding: var(--block-padding-small) 0 var(--block-padding) 0;
    border-bottom: 0.2rem solid #efefef;
`;
const ArticleTitle = styled.h1`
    margin: 0 auto;
    text-transform: uppercase;
    font-size: 3.25rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
`;
const ArticleMeta = styled.div`
    margin: 0 auto;
    opacity: 0.75;
    font-size: 1.25rem;
    font-weight: 600;
    font-size: 2rem;
`;
const ArticleAuthor = styled.div``;
const ArticleDate = styled.div``;

const ArticleTags = styled.div`
    overflow: hidden;
    display: flex;
    flex-wrap: wrap;
    gap: var(--block-spacer-small);
    margin-top: var(--block-padding-small);
`;
const ArticleTag = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 2rem;
    padding: var(--block-padding) var(--block-padding-large);
    text-transform: uppercase;
    background: var(--accent-secondary-dark);
    color: var(--accent-primary-text);
    border-radius: var(--block-border-radius);
`;

const ArticleContent = styled(ContentComponent)`
    width: 100%;
    overflow: hidden;
    font-weight: 400;
    margin: 0 auto;

    &::first-letter {
        //initial-letter: 2.25;
        font-weight: 700;
        //padding: 0 1rem 0.25rem 0;
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
    top: 12rem;
`;
const SidebarTitle = styled.div`
    text-transform: uppercase;
    font-weight: 700;
    font-size: 1.25rem;
`;
const SidebarLink = styled.div`
    width: 100%;
    font-size: 1.5rem;
    font-weight: 400;
    margin: 1rem 0;
    padding: 0 0 0.25rem 0;
    transition: 250ms ease-in-out;

    @media (hover: hover) and (pointer: fine) {
        a:hover {
            color: var(--accent-primary);
            text-decoration: underline;
        }
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
                    router.locales?.map((locale) => ({
                        hrefLang: locale,
                        href: `https://${Config.domain}/${(locale !== 'x-default' && `${locale}/`) || ''}blog/${
                            article.handle
                        }/`
                    })) || []
                }
                openGraph={{
                    url: `https://${Config.domain}/blog/${article.handle}/`,
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
                    site_name: store?.name
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
                publisherLogo={store?.favicon.src}
            />

            <PageContent primary>
                <ContentWrapper>
                    <Content>
                        <ArticleHeader>
                            {(article.image && (
                                <Banner>
                                    <Image src={article.image.url} alt={article.image.alt || ''} layout="fill" />
                                </Banner>
                            )) ||
                                null}

                            <ArticleTitle>{article.title}</ArticleTitle>

                            <ArticleMeta>
                                <ArticleAuthor>by {article.author.name}</ArticleAuthor>
                                <ArticleDate>{new Date(article.published_at).toDateString()}</ArticleDate>
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
                            {blog?.articles?.map((article: any) => (
                                <SidebarLink key={article.id}>
                                    <Link href={`/blog/${article.handle}/`}>{article.title}</Link>
                                </SidebarLink>
                            ))}

                            <SidebarTitle>Tags</SidebarTitle>
                            <ArticleTags>
                                {article?.tags?.map((tag: string) => <ArticleTag key={tag}>{tag}</ArticleTag>)}
                            </ArticleTags>
                        </SidebarContent>
                    </Sidebar>
                </ContentWrapper>

                <Breadcrumbs store={store} />
            </PageContent>
        </Page>
    );
};

export const getStaticPaths: GetStaticPaths = async ({}) => {
    const locales = Config.i18n.locales;
    const blog: any = await BlogApi({ handle: 'news' });

    let paths = [
        ...blog.articles
            ?.map((article: any) => [
                ...(locales?.map((locale) => ({
                    params: { handle: article?.handle, locale: locale }
                })) || [])
            ])
            .flat()
            .filter((a: any) => a?.params?.handle)
    ];

    return { paths, fallback: 'blocking' };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
    const { locale: localeData } = params as { locale: string };
    const locale = NextLocaleToLocale(localeData);

    let handle = '';
    if (params && Array.isArray(params.handle)) {
        handle = params?.handle?.join('') || '';
    } else {
        handle = (params?.handle as string) || '';
    }

    if (!isValidHandle(handle))
        return {
            notFound: true,
            revalidate: false
        };

    let article: any = null;
    let blog: any = null;

    try {
        article = (await ArticleApi({
            handle,
            blog: 'news',
            locale: locale.locale
        })) as any;
    } catch (error: any) {
        if (error.message?.includes('404')) {
            return {
                notFound: true
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

    try {
        blog = (await BlogApi({
            handle: 'news',
            locale: locale.locale
        })) as any;
    } catch (error) {
        console.error(error);
    }

    return {
        props: {
            article,
            blog,
            analytics: {
                pageType: AnalyticsPageType.article
            }
        },
        revalidate: 60
    };
};

export default ArticlePage;
