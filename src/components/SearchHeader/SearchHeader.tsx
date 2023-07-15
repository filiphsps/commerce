import React, { FunctionComponent, useEffect } from 'react';

import Button from '../Button';
import Image from 'next/image';
import { ImageLoader } from '../../util/ImageLoader';
import Link from 'next/link';
import PageContent from '../PageContent';
import PageLoader from '../PageLoader';
import { SearchApi } from '../../api/search';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { useStore } from 'react-context-hook';

const Container = styled.div`
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 25;
    width: 100%;
    max-height: 100%;
    max-height: calc(100% - env(safe-area-inset-bottom));
    background: #fefefe;
    border-bottom: 0.05rem solid #efefef;
    box-shadow: 0px 5px 15px -10px rgba(0, 0, 0, 0.75);

    @media (max-width: 950px) {
        z-index: 1000;
    }
`;

const Content = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2rem;
    width: 100%;
    padding: 1rem 0px 2rem 0px;

    @media (max-width: 950px) {
        padding: 1rem 0px;
        overflow-y: scroll;
        max-height: calc(100vh - 28rem);
        max-height: calc(100dvh - 28rem);
        grid-template-columns: 1fr;
    }
`;
const Section = styled.div`
    width: 100%;
    min-width: 30rem;
    height: 100%;
`;
const SectionLabel = styled.div`
    font-size: 2rem;
    font-weight: 600;
    line-height: 2rem;
    padding-bottom: 1rem;
    color: #404756;
`;

const Products = styled.div`
    overflow: hidden;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
    gap: 1rem;
`;

const ProductImage = styled.div`
    overflow: hidden;
    position: relative;
    height: 100%;
    width: 4rem;
    padding: 1rem;
    background: #fefefe;
    border-radius: var(--block-border-radius);

    img {
        object-fit: contain;
        mix-blend-mode: multiply;
    }
`;
const ProductMeta = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
`;
const ProductMetaTitle = styled.div`
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text-dark);
`;
const ProductMetaVendor = styled.div`
    font-weight: 700;
    font-size: 1.25rem;
    letter-spacing: 0.05rem;
    color: #404756;
`;

const Product = styled.a`
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
    padding: 1rem;
    background: #efefef;
    border-radius: var(--block-border-radius);
    border: 0.2rem solid #efefef;
    cursor: pointer;
    transition: 250ms ease-in-out;

    &:hover,
    &:active {
        border-color: var(--accent-primary);

        ${ProductMetaTitle}, ${ProductMetaVendor} {
            color: var(--accent-primary);
        }
    }
`;

interface SearchHeaderProps {
    query?: string;
    country?: string;
}
const SearchHeader: FunctionComponent<SearchHeaderProps> = ({ query }) => {
    const router = useRouter();
    const [, setSearch] = useStore<any>('search');
    const { data } = useSWR([`search_${query}`], () =>
        SearchApi({ query: query || '', limit: 4, locale: router.locale })
    );

    useEffect(() => {
        if (!query) return;

        (window as any)?.dataLayer?.push(
            { ecommerce: null },
            {
                event: 'search',
                query: query
            }
        );
    }, [query]);

    if (!query) return null;

    return (
        <Container>
            <PageContent primary>
                <Content>
                    <Section>
                        <SectionLabel>Products</SectionLabel>
                        {data ? (
                            <Products>
                                {data?.products?.map?.((product) => {
                                    const image = product.images.edges.at(0)?.node;
                                    return (
                                        <Link key={product.id} href={`/products/${product.handle}`}>
                                            <Product title={product.title}>
                                                <ProductImage>
                                                    {image && (
                                                        <Image
                                                            src={image.url}
                                                            alt={image.altText || ''}
                                                            title={image.altText || undefined}
                                                            fill
                                                            placeholder={'blur'}
                                                            blurDataURL={`/_next/image?url=${encodeURIComponent(
                                                                image?.url || ''
                                                            )}&w=16&q=1`}
                                                            loader={ImageLoader}
                                                        />
                                                    )}
                                                </ProductImage>
                                                <ProductMeta>
                                                    <ProductMetaVendor>
                                                        {product.vendor}
                                                    </ProductMetaVendor>
                                                    <ProductMetaTitle>
                                                        {product.title}
                                                    </ProductMetaTitle>
                                                </ProductMeta>
                                            </Product>
                                        </Link>
                                    );
                                })}
                            </Products>
                        ) : (
                            <PageLoader />
                        )}
                    </Section>

                    <Button
                        onClick={() => {
                            const q = encodeURI(query);

                            setSearch({ open: false, phrase: '' });

                            router.push(`/search/?q=${q}`);
                        }}
                    >
                        View more results
                    </Button>
                </Content>
            </PageContent>
        </Container>
    );
};

export default SearchHeader;
