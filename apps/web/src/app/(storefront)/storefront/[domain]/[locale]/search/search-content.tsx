'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiFilter, FiSearch, FiX } from 'react-icons/fi';

import type { Shop } from '@/api/shop';
import { SearchApi } from '@/api/shopify/search';
import { Input } from '@/components/Input';
import { Button } from '@/components/actionable/button';
import { LoadingIndicator } from '@/components/informational/loading-indicator';
import { Label } from '@/components/typography/label';
import { ApiBuilder } from '@/utils/abstract-api';
import type { Locale } from '@/utils/locale';
import { useApolloClient } from '@apollo/client';
import dynamic from 'next/dynamic';
import { styled } from 'styled-components';
import useSWR from 'swr';

const ProductSearchFilters = dynamic(
    () => import('@/components/ProductSearchFilters').then((c) => c.ProductSearchFilters),
    { ssr: false }
);
const ProductSearchResultItem = dynamic(
    () => import('@/components/ProductSearchResultItem').then((c) => c.ProductSearchResultItem),
    { ssr: false }
);

const Container = styled.article`
    display: contents;
`;

const Content = styled.section`
    display: flex;
    flex-direction: column;
    min-height: 60vh;
    gap: var(--block-spacer);
`;

const SearchButton = styled(Button)`
    height: 100%;
    width: 5rem;
    padding: 0;

    svg {
        font-size: 2rem;
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
        padding: 0 var(--block-padding-large);
        background: var(--color-block);
    }
`;
const SearchBarClear = styled(Button)`
    && {
        position: absolute;
        top: 0;
        right: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        width: 4rem;
        padding: 0;
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
        border: 0;
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
`;

type SearchContentProps = {
    shop: Shop;
    locale: Locale;
};
export default function SearchContent({ shop, locale }: SearchContentProps) {
    const router = useRouter();
    const query = useSearchParams()?.get('q') || '';

    const [input, setInput] = useState<string>(query || '');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        if (!window?.history?.state?.url) return;
        if (!window.history.state.url.includes('?q=')) return;

        const q = window.history.state.url.split('q=')?.at(-1);
        if (!q) return;

        setInput(decodeURI(q));
    }, []);

    useEffect(() => {
        if (!query) {
            window.history.replaceState(null, '', `/${locale.code}/search/`);
            return;
        }

        window.history.replaceState(null, '', `/${locale.code}/search/?q=${encodeURI(query)}`);
    }, [query]);

    const {
        data: results,
        isValidating,
        isLoading
    } = useSWR(
        (query.length > 0 && [
            'SearchApi',
            {
                client: ApiBuilder({ locale, shop, api: useApolloClient() }),
                query: query
            }
        ]) ||
            null,
        ([, props]) => SearchApi(props)
    );

    const { products, productFilters } = results || {};
    const count = products?.length || 0;

    return (
        <Container>
            <SearchHeader>
                <SearchBar>
                    <Input
                        type="search"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) =>
                            e.key === 'Enter' && router.push(`/${locale.code}/search/?q=${encodeURI(input)}`)
                        }
                        autoFocus={true}
                        spellCheck={false}
                        /* TODO: Make this configurable. */
                        placeholder="Find the perfect candy, chocolate, licorice and snacks"
                    />
                    {query.length > 0 && (
                        <SearchBarClear>
                            <FiX className="Icon" onClick={() => setInput('')} />
                        </SearchBarClear>
                    )}
                </SearchBar>

                <SearchButton
                    //disabled={!router.isReady}
                    onClick={() => router.push(`/${locale.code}/search/?q=${encodeURI(input)}`)}
                    /* TODO: Make this configurable. */
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
                {((isValidating || isLoading) && <LoadingIndicator />) ||
                    products?.map((product) => <ProductSearchResultItem key={product.id} product={product} />)}
            </Content>
        </Container>
    );
}
