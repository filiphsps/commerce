import React, { FunctionComponent, useEffect } from 'react';

import Image from 'next/legacy/image';
import Link from 'next/link';
import PageContent from '../PageContent';
import PageLoader from '../PageLoader';
import { SearchApi } from '../../api/search';
import styled from 'styled-components';
import useSWR from 'swr';

const Wrapper = styled(PageContent)`
    margin: 0px auto;
`;

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
        overflow-y: scroll;
        max-height: calc(100vh - 10rem);
        max-height: calc(100dvh - 10rem);
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
    text-transform: uppercase;
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
    text-transform: uppercase;
`;
const ProductMetaVendor = styled.div`
    font-weight: 700;
    font-size: 1.25rem;
    letter-spacing: 0.05rem;
    text-transform: uppercase;
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
    transition: 150ms ease-in-out;

    &:hover,
    &:active {
        border-color: var(--accent-primary);

        ${ProductMetaTitle}, ${ProductMetaVendor} {
            color: var(--accent-primary);
        }
    }
`;

const Collections = styled.div`
    display: grid;
    gap: 0.5rem;
    width: 100%;
    padding: 1rem;
    background: #efefef;
    border-radius: var(--block-border-radius);
`;
const Collection = styled.a`
    display: block;
    width: 100%;
    text-transform: uppercase;
    font-size: 1.5rem;
    font-weight: 600;
    cursor: pointer;

    &:hover {
        color: var(--accent-primary);
    }
`;

interface SearchHeaderProps {
    query?: string;
    country?: string;
}
const SearchHeader: FunctionComponent<SearchHeaderProps> = (props) => {
    const { data } = useSWR([props.query || null], (url) =>
        SearchApi(url || '')
    );

    useEffect(() => {
        if (!props.query) return;

        (window as any)?.dataLayer?.push({
            event: 'search',
            query: props.query
        });
    }, [props.query]);

    if (!props.query) return null;

    return (
        <Container>
            <Wrapper>
                <Content>
                    <Section>
                        <SectionLabel>Products</SectionLabel>
                        {data ? (
                            <Products>
                                {data?.products?.map((product) => (
                                    <Link
                                        key={product.id}
                                        href={`/products/${product.handle}`}
                                    >
                                        <Product title={product.title}>
                                            <ProductImage>
                                                <Image
                                                    src={product.image}
                                                    layout="fill"
                                                />
                                            </ProductImage>
                                            <ProductMeta>
                                                <ProductMetaVendor>
                                                    {product.vendor.title}
                                                </ProductMetaVendor>
                                                <ProductMetaTitle>
                                                    {product.title}
                                                </ProductMetaTitle>
                                            </ProductMeta>
                                        </Product>
                                    </Link>
                                ))}
                            </Products>
                        ) : (
                            <PageLoader />
                        )}
                    </Section>
                    <Section>
                        <SectionLabel>Collections</SectionLabel>
                        {data ? (
                            <Collections>
                                {data?.collections?.map((collection) => (
                                    <Link
                                        key={collection.id}
                                        href={`/collections/${collection.handle}`}
                                    >
                                        <Collection>
                                            {collection.title}
                                        </Collection>
                                    </Link>
                                ))}
                            </Collections>
                        ) : (
                            <PageLoader />
                        )}
                    </Section>
                </Content>
            </Wrapper>
        </Container>
    );
};

export default SearchHeader;
