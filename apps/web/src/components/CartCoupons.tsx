import { FiTag, FiX } from 'react-icons/fi';

import type { FunctionComponent } from 'react';
import styled from 'styled-components';
import { useCart } from '@shopify/hydrogen-react';

const Container = styled.section`
    display: flex;
    flex-wrap: wrap;
    gap: var(--block-spacer);
    align-items: center;
    justify-content: space-between;
`;
const Badge = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: calc(var(--block-spacer-small) / 2);
    width: fit-content;
    padding: var(--block-padding-small) var(--block-padding);
    border-radius: var(--block-border-radius);
    background: var(--accent-secondary);
    color: var(--accent-secondary-text);
`;
const Label = styled.div`
    gap: var(--block-spacer-small);
    font-weight: 500;
    font-size: 1.5rem;
    line-height: 1.5rem;
`;
const DiscountCodes = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: end;
    flex-grow: 1;
    gap: var(--block-spacer-small);
`;
const DiscountCodeItem = styled(Badge)`
    min-height: 2rem;
    font-weight: 600;
    font-size: 1.25rem;
    line-height: 1.5rem;
    text-align: center;
    transition: 150ms ease-in-out;
`;
const DiscountCodeItemRemove = styled(FiX)`
    display: none;
    cursor: pointer;

    &:hover {
        color: var(--color-danger);
    }
`;

const Form = styled.div`
    display: none;
`;

interface CartCouponsProps {}
export const CartCoupons: FunctionComponent<CartCouponsProps> = ({}) => {
    const { discountCodes, discountCodesUpdate, status } = useCart();

    if ((status !== 'idle' && status !== 'updating') || !discountCodes?.length) return null;

    return (
        <Container>
            <Label>Applied Promo</Label>
            <DiscountCodes>
                {discountCodes?.map(
                    (discount) =>
                        (discount?.code && (
                            <DiscountCodeItem key={discount?.code}>
                                <FiTag />
                                {discount?.code}
                                <DiscountCodeItemRemove
                                    onClick={() =>
                                        discountCodesUpdate(
                                            (discountCodes.filter((i) => i?.code !== discount?.code) as any) || []
                                        )
                                    }
                                />
                            </DiscountCodeItem>
                        )) ||
                        null
                )}
            </DiscountCodes>

            <Form></Form>
        </Container>
    );
};
