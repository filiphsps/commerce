import { FiFilter, FiSearch, FiX } from 'react-icons/fi';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import { useEffect, useState } from 'react';

import { AnalyticsPageType } from '@shopify/hydrogen-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Button } from '@/components/Button';
import { Config } from '@/utils/Config';
import type { CustomPageDocument } from '@/prismic/types';
import type { FunctionComponent } from 'react';
import { Input } from '@/components/Input';
import { Label } from '@/components/Label';
import { NextLocaleToLocale } from '@/utils/Locale';
import { NextSeo } from 'next-seo';
import { SearchApi } from '@/api/search';
import type { ShopifyPageViewPayload } from '@shopify/hydrogen-react';
import { SliceZone } from '@prismicio/react';
import type { StoreModel } from '@/models/StoreModel';
import { asText } from '@prismicio/client';
import { components } from '@/slices';
import { createClient } from '@/prismic';
import dynamic from 'next/dynamic';
import { styled } from '@linaria/react';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const Page = dynamic(() => import('@/components/Page'));
const PageContent = dynamic(() => import('@/components/PageContent'));
const PageHeader = dynamic(() => import('@/components/PageHeader'));
const PageLoader = dynamic(() => import('@/components/PageLoader'));

const ProductSearchFilters = dynamic(
    () => import('@/components/ProductSearchFilters').then((c) => c.ProductSearchFilters),
    { ssr: false }
);
const ProductSearchResultItem = dynamic(
    () => import('@/components/ProductSearchResultItem').then((c) => c.ProductSearchResultItem),
    { ssr: false }
);

const Content = styled.section`
    display: flex;
    flex-direction: column;
    min-height: 60vh;
    gap: var(--block-spacer);
`;

const SearchButton = styled(Button)`
    height: 100%;
    width: 5rem;
    padding: 0px;

    svg {
        font-size: 2rem;
        stroke-width: 0.4ex;
    }
`;

const SearchBar = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    width: 100%;
    height: 100%;
    position: relative;

    ${Input} {
        width: 100%;
        height: 100%;
        padding: 0px var(--block-padding-large);
        background: var(--color-block);
    }
`;
const SearchBarClear = styled(Button)`
    && {
        position: absolute;
        top: 0px;
        right: 0px;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        width: 4rem;
        padding: 0px;
        color: var(--color-dark);
        background: transparent;
        border-radius: var(--block-border-radius);
        font-size: 2.25rem;
        line-height: 2.25rem;
    }
`;

const SearchHeader = styled.section`
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--block-spacer);
    height: 5rem;

    ${Input}, button {
        height: 100%;
        border: 0px;
    }

    ${Label} {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--block-spacer-small);

        svg {
            margin-top: -0.1rem;
        }
    }
`;
const ContentHeader = styled(SearchHeader)`
    grid-template-columns: auto auto;
    align-items: center;
    justify-content: space-between;

    padding: var(--block-padding) var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--accent-primary);
    color: var(--accent-primary-text);

    ${Label} {
        height: 100%;
        width: 100%;
        text-align: right;
        justify-content: end;
        font-size: 1.5rem;
        line-height: 1.5rem;

        &:first-child {
            text-align: left;
            justify-content: start;
        }
    }
`;

const SearchPage: FunctionComponent<InferGetStaticPropsType<typeof getStaticProps>> = ({ page, store }) => {
    const router = useRouter();
    const [query, setQuery] = useState<string>('');
    const [input, setInput] = useState<string>('');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        if (!window?.history?.state?.url) return;
        if (!window.history.state.url.includes('?q=')) return;

        const q = window.history.state.url.split('q=')?.at(-1);
        if (!q) return;

        setInput(decodeURI(q));
        setQuery(decodeURI(q));
    }, []);

    useEffect(() => {
        if (!router.isReady) return;

        if (!query) {
            window.history.replaceState(null, '', `/${router.locale}/search/`);
            return;
        }

        window.history.replaceState(null, '', `/${router.locale}/search/?q=${encodeURI(query)}`);
    }, [query]);

    const {
        data: results,
        isValidating,
        isLoading
    } = useSWR(
        (router.isReady &&
            query.length > 0 && [
                'SearchApi',
                {
                    query: query,
                    locale: router.locale
                }
            ]) ||
            null,
        ([, props]) => SearchApi(props)
    );

    const { products, productFilters } = results || {};
    const count = products?.length || 0;

    return (
        <Page className="SearchPage">
            <NextSeo
                title={page?.data?.meta_title || page?.data.title!}
                description={
                    (page?.data?.meta_description && asText(page?.data.meta_description)) ||
                    page?.data?.description! ||
                    ''
                }
                canonical={`https://${Config.domain}/${router.locale}/search/`}
                languageAlternates={
                    router.locales?.map((locale) => ({
                        hrefLang: locale,
                        href: `https://${Config.domain}/${(locale !== 'x-default' && `${locale}/`) || ''}search/`
                    })) || []
                }
                openGraph={{
                    url: `https://${Config.domain}${router.locale}/search/`,
                    type: 'website',
                    title: page?.data.meta_title || page?.data.title!,
                    description:
                        (page?.data.meta_description && asText(page.data.meta_description)) ||
                        page?.data.description ||
                        '',
                    siteName: store?.name,
                    locale: (router.locale !== 'x-default' && router.locale) || Config.i18n.default,
                    images:
                        (page?.data?.meta_image && [
                            {
                                url: page?.data?.meta_image!.url as string,
                                width: page?.data?.meta_image!.dimensions?.width || 0,
                                height: page?.data?.meta_image!.dimensions?.height || 0,
                                alt: page?.data?.meta_image!.alt || '',
                                secureUrl: page?.data?.meta_image!.url as string
                            }
                        ]) ||
                        undefined
                }}
            />

            <PageContent primary>
                <PageHeader title={page?.data.title} subtitle={page?.data.description} />

                <SliceZone slices={page?.data.slices} components={components} context={{ store }} />

                <SearchHeader>
                    <SearchBar>
                        <Input
                            type="search"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && setQuery(input)}
                            autoFocus={true}
                            spellCheck={false}
                            /* TODO: Make this configurable */
                            placeholder="Find the perfect candy, chocolate, licorice and snacks"
                        />
                        {query.length > 0 && (
                            <SearchBarClear>
                                <FiX className="Icon" onClick={() => setInput('')} />
                            </SearchBarClear>
                        )}
                    </SearchBar>

                    <SearchButton
                        disabled={!router.isReady}
                        onClick={() => setQuery(input)}
                        /* TODO: Make this configurable */
                        title="Press this to search the world of Swedish sweets and candy"
                    >
                        <FiSearch />
                    </SearchButton>
                </SearchHeader>

                {((count > 1 || productFilters) && (
                    <ContentHeader>
                        {productFilters && (
                            <Label onClick={() => setShowFilters(!showFilters)} style={{ opacity: 0.5 }}>
                                <FiFilter /> Filter and Sort
                            </Label>
                        )}
                        {count > 1 && <Label>{count} Results</Label>}
                    </ContentHeader>
                )) ||
                    null}

                {process.env.NODE_ENV === 'development' && productFilters && (
                    <ProductSearchFilters filters={productFilters} open={showFilters} />
                )}

                <Content>
                    {((isValidating || isLoading) && <PageLoader />) ||
                        products?.map((product) => <ProductSearchResultItem key={product.id} product={product} />)}
                </Content>

                <Breadcrumbs
                    pages={[
                        {
                            title: page?.data.title,
                            url: '/search'
                        }
                    ]}
                    store={store}
                />
            </PageContent>
        </Page>
    );
};

export const getStaticProps: GetStaticProps<{
    page: CustomPageDocument<string> | null;
    analytics?: Partial<ShopifyPageViewPayload>;
    store?: StoreModel;
}> = async ({ locale: localeData, previewData }) => {
    const client = createClient({ previewData });
    const locale = NextLocaleToLocale(localeData);

    const uid = 'search';
    let page: CustomPageDocument<string> | null = null;
    try {
        page = await client.getByUID('custom_page', uid, {
            lang: locale.locale
        });
    } catch (error) {
        try {
            page = await client.getByUID('custom_page', uid);
        } catch {}
    }

    return {
        props: {
            page,
            analytics: {
                pageType: AnalyticsPageType.search
            }
        },
        revalidate: 60
    };
};

export default SearchPage;
