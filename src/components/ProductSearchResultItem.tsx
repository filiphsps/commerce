import { Image, ProductPrice } from '@shopify/hydrogen-react';
import { Subtitle, Title } from './PageHeader/PageHeader';

import { FunctionComponent } from 'react';
import Link from 'next/link';
import { Product } from '@shopify/hydrogen-react/storefront-api-types';
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
    box-shadow: 0px 0px 1rem 0px var(--color-block-shadow);

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
export const ProductSearchResultItem: FunctionComponent<ProductSearchResultItemProps> = ({
    product
}) => {
    return (
        <Link href={`/products/${product.handle}/`}>
            <Container>
                <ImageWrapper>
                    <Image data={product.images?.edges?.at(0)?.node || undefined} />
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
