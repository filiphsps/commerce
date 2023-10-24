'use client';

import { CartLineProvider, CartWithActions } from '@shopify/hydrogen-react';

import CartItem from '@/components/CartItem';
import PageLoader from '@/components/PageLoader';
import { styled } from 'styled-components';

const Container = styled.table`
    display: block;
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 1rem;
    font-size: 1.25rem;
    table-layout: fixed;

    tbody,
    thead {
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: var(--block-spacer);
        width: 100%;
        max-width: 100%;
    }

    @media (min-width: 1418px) {
        border-spacing: 0;
        table-layout: auto;
        border-collapse: collapse;

        tbody {
            max-width: 100%;

            display: grid;
            grid-template-columns: calc(50% - 0.5rem) calc(50% - 0.5rem);
            gap: var(--block-spacer);
        }
    }
`;

type CartContentProps = {
    cart: CartWithActions;
};
export default function CartLines({ cart }: CartContentProps) {
    if (!cart.lines || cart.lines.length <= 0) return <PageLoader />;

    return (
        <Container>
            <tbody>
                {cart.lines?.map((item) => {
                    if (!item) return null;

                    return (
                        <CartLineProvider key={item.id} line={item}>
                            <CartItem />
                        </CartLineProvider>
                    );
                })}
            </tbody>
        </Container>
    );
}
