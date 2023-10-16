import { Image, ProductPrice } from '@shopify/hydrogen-react';
import { Subtitle, Title } from '@/components/PageHeader/PageHeader';

import { AppendShopifyParameters } from '@/components/ProductCard/ProductCard';
import type { FunctionComponent } from 'react';
import Link from 'next/link';
import type { Product } from '@shopify/hydrogen-react/storefront-api-types';
import styled from 'styled-components';

const Container = styled.div`
    display: grid;
    grid-template-columns: 10rem 1fr auto;
    gap: 1.5rem;
    min-height: 12rem;
    padding: var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--color-block);
    color: var(--color-dark);
`;
const Meta = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.25rem;
`;
const MetaVendor = styled(Subtitle)`
    font-size: 1.75rem;
    line-height: 1.75rem;
`;
const MetaTitle = styled(Title)`
    font-size: 2rem;
    line-height: 2.25rem;
`;
const Pricing = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.25rem;
`;
const PricingPrice = styled(Title)`
    font-size: 2.25rem;
    line-height: 2.25rem;
`;

const ImageWrapper = styled.div`
    background: var(--color-bright);
    border-radius: var(--block-border-radius);
    overflow: hidden;
    height: 100%;
    width: 100%;
    padding: 1rem;

    img {
        height: 100%;
        width: 100%;
        object-position: center;
        object-fit: contain;
    }
`;

interface ProductSearchResultItemProps {
    product: Product;
}
export const ProductSearchResultItem: FunctionComponent<ProductSearchResultItemProps> = ({ product }) => {
    const href = AppendShopifyParameters({
        url: `/products/${product.handle}/`,
        params: (product as any).trackingParameters
    });

    return (
        <Link href={href || ''}>
            <Container>
                <ImageWrapper>
                    <Image data={product.images?.edges?.at(0)?.node || undefined} width={125} />
                </ImageWrapper>
                <Meta>
                    <MetaVendor>{product.vendor}</MetaVendor>
                    <MetaTitle>{product.title}</MetaTitle>
                </Meta>
                <Pricing>
                    <ProductPrice data={product} as={PricingPrice} />
                </Pricing>
            </Container>
        </Link>
    );
};
