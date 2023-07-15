import { FiFilter, FiSearch, FiX } from 'react-icons/fi';
import React, { FunctionComponent, useCallback, useEffect, useState } from 'react';

import { AnalyticsPageType } from '@shopify/hydrogen-react';
import Breadcrumbs from '../src/components/Breadcrumbs';
import { Button } from '../src/components/Button';
import { Config } from '../src/util/Config';
import Input from '../src/components/Input';
import { Label } from '../src/components/Label';
import LanguageString from '../src/components/LanguageString';
import { NextSeo } from 'next-seo';
import Page from '../src/components/Page';
import PageContent from '../src/components/PageContent';
import PageHeader from '../src/components/PageHeader';
import PageLoader from '../src/components/PageLoader';
import { ProductSearchFilters } from '../src/components/ProductSearchFilters';
import { ProductSearchResultItem } from '../src/components/ProductSearchResultItem';
import { SearchApi } from '../src/api/search';
import { StoreModel } from '../src/models/StoreModel';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const Content = styled.section`
    display: flex;
    flex-direction: column;
    min-height: 60vh;
    gap: var(--block-spacer);
`;

const SearchButton = styled(Button)`
    padding: 0px;

    svg {
        font-size: 2rem;
        stroke-width: 0.4ex;
    }
`;

const SearchBar = styled.div`
    width: 100%;
    height: 100%;
    position: relative;

    ${Input} {
        width: 100%;
        height: 100%;
    }
`;
const SearchBarClear = styled.div`
    position: absolute;
    top: 0px;
    right: 0px;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    padding: 0px var(--block-padding-large);
    color: var(--color-dark);
    background: var(--color-bright);
    border-radius: var(--block-border-radius);
    font-size: 2.25rem;
    line-height: 2.25rem;
`;

const SearchHeader = styled.section`
    display: grid;
    grid-template-columns: 1fr 5.25rem;
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

interface SearchPageProps {
    store: StoreModel;
}
const SearchPage: FunctionComponent<SearchPageProps> = ({ store }) => {
    const router = useRouter();
    const [query, setQuery] = useState<string>('');
    const [input, setInput] = useState<string>('');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        const q = router.query?.q?.toString();
        if (!q || q == query) return;

        setQuery(q);
    }, [router.query]);

    useEffect(() => {
        setInput(query);
    }, [query]);

    const {
        data: results,
        mutate,
        isValidating,
        isLoading
    } = useSWR(
        [`search_${query}` || ''],
        () => SearchApi({ query: query || '', locale: router.locale }),
        {
            fallbackData: {
                products: [],
                collections: []
            } as any,
            refreshInterval: 0,
            revalidateOnFocus: false,
            revalidateOnMount: false,
            revalidateOnReconnect: false,
            refreshWhenOffline: false,
            refreshWhenHidden: false
        }
    );

    useEffect(() => {
        mutate(results, { revalidate: true });
    }, []);

    const handleSubmit = useCallback(
        (query: string) => {
            setQuery(query);

            mutate(results, { revalidate: true });
            router.replace({
                ...router,
                query: {
                    ...router.query,
                    q: (query.length > 0 && query) || undefined
                }
            });
        },
        [mutate, router, query]
    );

    const { products, productFilters } = results;
    const count = products.length;

    return (
        <Page className="BlogPage">
            <NextSeo
                title="Search"
                canonical={`https://${Config.domain}/${router.locale}/search/`}
                languageAlternates={
                    router.locales?.map((locale) => ({
                        hrefLang: locale,
                        href:
                            (locale !== 'x-default' &&
                                `https://${Config.domain}/${locale}/search/`) ||
                            `https://${Config.domain}/search/`
                    })) || []
                }
            />

            <PageContent primary>
                <PageHeader title="Search" />

                <SearchHeader>
                    <SearchBar>
                        <Input
                            type="search"
                            value={input || ''}
                            disabled={isValidating || isLoading}
                            onChange={(e) => setInput(e.target.value || '')}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit(input)}
                            autoFocus
                            /* TODO: Make this configurable */
                            placeholder="Find the perfect candy, chocolate, licorice and snacks"
                        />
                        {query.length > 0 && (
                            <SearchBarClear>
                                <FiX className="Icon" onClick={() => handleSubmit('')} />
                            </SearchBarClear>
                        )}
                    </SearchBar>

                    <SearchButton
                        disabled={isValidating || isLoading}
                        onClick={() => handleSubmit(query)}
                        /* TODO: Make this configurable */
                        title="Press this to search the world of Swedish sweets and candy"
                    >
                        <FiSearch />
                    </SearchButton>
                </SearchHeader>

                {count > 1 && (
                    <ContentHeader>
                        {process.env.NODE_ENV === 'development' && productFilters && (
                            <Label onClick={() => setShowFilters(!showFilters)}>
                                <FiFilter /> Filter and Sort
                            </Label>
                        )}
                        {count > 1 && <Label>{count} Results</Label>}
                    </ContentHeader>
                )}

                {process.env.NODE_ENV === 'development' && (
                    <ProductSearchFilters filters={productFilters} open={showFilters} />
                )}

                <Content>
                    {((isValidating || isLoading) && <PageLoader />) ||
                        products.map((product) => (
                            <ProductSearchResultItem key={product.id} product={product} />
                        ))}
                </Content>

                <Breadcrumbs
                    pages={[
                        {
                            title: <LanguageString id={'search'} />,
                            url: '/search'
                        }
                    ]}
                    store={store}
                    hideSocial={true}
                />
            </PageContent>
        </Page>
    );
};

export async function getStaticProps({}) {
    return {
        props: {
            analytics: {
                pageType: AnalyticsPageType.search
            }
        }
    };
}

export default SearchPage;
