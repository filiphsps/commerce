'use client';

import { Money } from '@shopify/hydrogen-react';
import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';
import { styled } from 'styled-components';

const Container = styled.section`
    display: flex;
    flex-direction: column;
`;
const Span = styled.span``;
const Price = styled.div`
    position: relative;
    display: inline-block;
    font-size: 4rem;
    line-height: 100%;
    font-weight: 700;

    &.Sale,
    .Sale {
        color: var(--color-sale);
    }
`;
const PreviousPrice = styled(Price)`
    font-size: 2rem;
    font-weight: 600;
`;
const Strike = styled.s`
    position: relative;
    text-decoration: none;

    &::before {
        top: 50%;
        background: var(--color-gray);
        content: '';
        width: 110%;
        position: absolute;
        height: 0.1em;
        border-radius: 0.1em;
        left: -5%;
        white-space: nowrap;
        display: block;
        transform: rotate(-15deg);
    }
`;

type PricingProps = {
    price: MoneyV2;
    compareAtPrice?: MoneyV2;
};
const Pricing = ({ price, compareAtPrice }: PricingProps) => {
    return (
        <Container>
            {compareAtPrice && (
                <PreviousPrice>
                    <Strike>
                        <Money data={compareAtPrice} as={Span} />
                    </Strike>
                </PreviousPrice>
            )}
            <Price>
                <Money data={price} as={Span} className={(compareAtPrice && 'Sale') || ''} />
            </Price>
        </Container>
    );
};

export default Pricing;
