'use client';

import type { HTMLProps } from 'react';
import { Money } from '@shopify/hydrogen-react';
import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';
import { styled } from 'styled-components';

const Container = styled.section`
    display: flex;
    flex-direction: row;
    justify-content: start;
    align-items: end;
    gap: var(--block-spacer-small);
`;
const Span = styled.span``;
const Price = styled.div`
    position: relative;
    display: inline-block;
    font-size: 2.5rem;
    line-height: 1;
    font-weight: 700;

    &.Sale,
    .Sale {
        color: var(--color-sale);
    }
`;
const PreviousPrice = styled(Price)`
    font-size: 2rem;
    font-weight: 600;
    color: var(--color-gray);
`;
const Strike = styled.s`
    position: relative;
    text-decoration: none;

    &::before {
        content: '';
        position: absolute;
        display: block;
        height: 0.25rem;
        width: calc(100% - 0.5rem);
        inset: 50% 0 0 0;
        white-space: nowrap;
        border-radius: 1rem;
        transform: rotate(-15deg);
        background: var(--color-gray);
    }
`;

type PricingProps = {
    price: MoneyV2;
    compareAtPrice?: MoneyV2;
} & HTMLProps<HTMLDivElement>;
const Pricing = (props: PricingProps) => {
    const { price, compareAtPrice } = props;

    return (
        <Container {...props}>
            <Price>
                <Money data={price} as={Span} className={(compareAtPrice && 'Sale') || ''} />
            </Price>
            {compareAtPrice && (
                <PreviousPrice>
                    <Strike>
                        <Money data={compareAtPrice} as={Span} />
                    </Strike>
                </PreviousPrice>
            )}
        </Container>
    );
};

export default Pricing;
