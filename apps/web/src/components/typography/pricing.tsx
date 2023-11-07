'use client';

import { RemoveInvalidProps } from '@/utils/remove-invalid-props';
import { Money } from '@shopify/hydrogen-react';
import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';
import type { HTMLProps } from 'react';
import { styled } from 'styled-components';

const Container = styled.section`
    display: flex;
    flex-direction: row;
    justify-content: start;
    align-items: end;
    gap: var(--block-spacer-small);

    @media (min-width: 920px) {
        flex-direction: column-reverse;
        gap: 0;
    }
`;
const Span = styled.span``;
const Price = styled.div`
    position: relative;
    display: inline-block;
    font-size: 3rem;
    line-height: 1;
    font-weight: 700;

    &.Sale,
    .Sale {
        color: var(--color-sale);
    }
`;
const PreviousPrice = styled(Price)`
    font-size: 2rem;
    font-weight: 400;
    color: var(--color-gray);

    // Optically balance.
    padding-bottom: 0.15rem;
`;
const Strike = styled.s`
    position: relative;
    text-decoration: none;

    &::before {
        content: '';
        position: absolute;
        display: block;
        height: 0.25rem;
        width: 95%;
        inset: 48% 0 0 2.5%;
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
        <Container {...RemoveInvalidProps(props)}>
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
