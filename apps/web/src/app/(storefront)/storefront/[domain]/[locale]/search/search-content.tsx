'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { FiFilter, FiSearch, FiX } from 'react-icons/fi';

import type { Shop } from '@/api/shop';
import { Input } from '@/components/Input';
import { Button } from '@/components/actionable/button';
import { Label } from '@/components/typography/label';
import type { Locale } from '@/utils/locale';
import { styled } from 'styled-components';
import { ProductSearchFilters } from '@/components/ProductSearchFilters';
import { ProductSearchResultItem } from '@/components/ProductSearchResultItem';

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

export type SearchContentProps = {
    shop: Shop;
    locale: Locale;
    query?: string;
};
export default function SearchContent({ shop, locale }: SearchContentProps) {
    const { replace } = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    function handleSearch(term?: string) {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set('q', term);
        } else {
            params.delete('q');
        }

        replace(`${pathname}?${params.toString()}`);
    }

    const products: any[] = [];
    const count: number = products?.length || 0;
    return (
        <Container>
            <SearchHeader>
                <SearchBar>
                    <Input
                        type="search"
                        defaultValue={searchParams.get('q')?.toString()}
                        onChange={(e) => handleSearch(e.target.value)}
                        autoFocus={true}
                        spellCheck={true}
                        /* TODO: Make this copy configurable. */
                        placeholder="Find the perfect candy, chocolate, licorice and snacks"
                    />

                    <SearchBarClear>
                        <FiX className="Icon" onClick={() => handleSearch()} />
                    </SearchBarClear>
                </SearchBar>

                <SearchButton onClick={() => console.warn('todo')} title="Search">
                    <FiSearch />
                </SearchButton>
            </SearchHeader>
            <ContentHeader>
                <Label onClick={() => console.warn('todo')}>
                    <FiFilter /> Filter and Sort
                </Label>
                <Label>{count} Results</Label>
            </ContentHeader>

            <ProductSearchFilters filters={null} open={false} />

            <Content>
                <Suspense key={query}>
                    {products ? products.map((product: any) => <ProductSearchResultItem key={product.id} product={product} />) : null}
                </Suspense>
            </Content>
        </Container>
    );
}
