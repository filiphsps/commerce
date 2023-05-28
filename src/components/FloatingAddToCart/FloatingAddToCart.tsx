import Button from '../Button';
import { FunctionComponent } from 'react';
import Image from 'next/legacy/image';
import { ProductModel } from '../../models/ProductModel';
import styled from 'styled-components';

const Container = styled.div`
    z-index: 1;
    position: fixed;
    bottom: 0px;
    left: 0px;
    right: 0px;
    height: 10rem;
    margin-right: 0px;
    padding: 1rem;
    border-top: 0.2rem solid #e9e9e9;
    background: #efefef;
    box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.25);

    @media (min-width: 950px) {
        display: none;
    }
`;
const Content = styled.div`
    display: grid;
    grid-template-columns: 8rem 1fr;
    gap: 1rem;
    width: calc(100% - 7rem);
    height: 100%;
`;
const ProductImage = styled.div`
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #fefefe;
    border-radius: var(--block-border-radius);
`;
const ProductImageWrapper = styled.div`
    padding: 1rem;
    position: relative;
    width: 6rem;
    height: 6rem;

    img {
        object-fit: contain;
    }
`;

const ProductActions = styled.div`
    overflow: hidden;
    display: flex;
    flex-direction: column;
    width: 100%;
`;

const ProductMeta = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    height: 100%;
    width: 100%;
`;
const ProductMetaVendor = styled.div`
    font-weight: 700;
    font-size: 1.25rem;
    letter-spacing: 0.05rem;
    text-transform: uppercase;
    color: #404756;
`;
const ProductMetaTitle = styled.div`
    overflow: hidden;
    width: 100%;
    font-size: 1.75rem;
    font-weight: 600;
    text-transform: uppercase;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const BuyButton = styled(Button)`
    padding: 1rem 0.5rem;
    line-height: 100%;
    font-size: 1.25rem;
`;

interface FloatingAddToCartProps {
    product: ProductModel;
    variant: number;
    addToCart: any;
    addedToCart?: boolean;
}
const FloatingAddToCart: FunctionComponent<FloatingAddToCartProps> = ({
    product,
    variant,
    addToCart,
    addedToCart
}) => {
    return (
        <Container>
            <Content>
                <ProductImage>
                    <ProductImageWrapper>
                        <Image src={product.images[0].src} layout="fill" />
                    </ProductImageWrapper>
                </ProductImage>
                <ProductActions>
                    <ProductMeta>
                        <ProductMetaVendor>
                            {product.vendor.title}
                        </ProductMetaVendor>
                        <ProductMetaTitle>{product.title}</ProductMetaTitle>
                    </ProductMeta>
                    <BuyButton
                        className={`Button ${addedToCart ? 'Added' : ''}`}
                        onClick={addToCart}
                        disabled={!product?.variants[variant]?.available}
                    >
                        {addedToCart ? 'Added!' : 'Add to Cart'}
                    </BuyButton>
                </ProductActions>
            </Content>
        </Container>
    );
};

export default FloatingAddToCart;
