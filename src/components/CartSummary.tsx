import { CartCost, Money, useCart } from '@shopify/hydrogen-react';
import { FiChevronRight, FiEdit, FiLock } from 'react-icons/fi';
import { useEffect, useState } from 'react';

import { Button } from '@/components/Button';
import { CartCoupons } from '@/components/CartCoupons';
import { CartNote } from '@/components/CartNote';
import { FreeShippingProgress } from '@/components/FreeShippingProgress';
import type { FunctionComponent } from 'react';
import Link from 'next/link';
import PageLoader from '@/components/PageLoader';
import { Pluralize } from '@/utils/Pluralize';
import styled from 'styled-components';
import { useTranslation } from 'next-i18next';

const Container = styled.section`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer);
`;
const Block = styled.section`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer);
    padding: var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--accent-secondary-light);
    color: var(--color-dark);
    transition: 250ms ease-in-out;
`;
const SmallBlock = styled(Block)`
    padding: var(--block-padding);
    background: var(--color-block);
`;

const Label = styled.div`
    font-size: 1.75rem;
    line-height: 2rem;
    font-weight: 500;
`;

const Notice = styled(Label)`
    && {
        font-size: 1.25rem;
        line-height: 1.5rem;
        font-weight: 500;
        margin-top: calc(var(--block-spacer-large) * -0.25);
    }

    .Lock {
        display: inline-block;
        font-size: 1.25rem;
        line-height: 0px;
        margin: 0px 0.25rem 0.15rem 0px;
    }

    a {
        color: var(--accent-primary-dark);
        text-decoration: underline;
        text-decoration-style: dotted;
        text-decoration-thickness: 0.2rem;
        text-underline-offset: calc(var(--block-border-width) / 2);

        &:hover {
            color: var(--accent-primary-light);
        }
    }
`;
const Action = styled.div`
    font-size: 1.25rem;
    line-height: 1.5rem;
    font-weight: 600;
    cursor: pointer;
    opacity: 0.75;
    transition: 250ms ease-in-out;

    &:hover {
        color: var(--accent-primary-dark);
        opacity: 1;
    }

    svg {
        margin-bottom: 0.15rem;
    }
`;

const CheckoutButtonIcon = styled.div`
    display: grid;
    grid-template-columns: auto;
    justify-content: right;
    align-items: right;
    flex-shrink: 0;
    font-size: 2.25rem;
    line-height: 100%;
    width: 0px;
    height: 100%;
    transition: 250ms ease-in-out;
    opacity: 0;

    svg {
        display: block;
    }
`;
const CheckoutButton = styled(Button)`
    && {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        gap: 0px;
        height: 5rem;
        padding: var(--block-padding-large);
        border-radius: var(--block-border-radius);
        font-size: 1.5rem;
        line-height: 1.5rem;

        &:hover {
            gap: var(--block-padding);

            ${CheckoutButtonIcon} {
                width: 3rem;
                opacity: 1;
            }
        }
    }
`;

const FreeShipping = styled(FreeShippingProgress)`
    padding-top: var(--block-padding);
    border-top: calc(var(--block-border-width) / 1.5) dotted var(--color-gray);
`;

const Center = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
`;

const Breakdown = styled.section`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer-large);

    @media (min-width: 950px) {
        gap: var(--block-spacer);
    }
`;

const BreakdownItemLabel = styled.div`
    display: flex;
    align-items: stretch;
    justify-content: start;
    gap: var(--block-spacer-small);
    font-weight: 500;
    font-size: 1.5rem;
    line-height: 1.5rem;
`;
const BreakdownItemMoney = styled.div`
    font-weight: 500;
    font-size: 1.5rem;
    line-height: 1.5rem;
    align-self: start;
`;
const BreakdownItem = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--block-spacer);
    align-items: end;
    justify-content: stretch;
    color: var(--color-dark);
`;

const BreakdownTotalItem = styled(BreakdownItem)`
    margin-top: var(--block-padding-small);
    padding-top: var(--block-padding-small);
    border-top: calc(var(--block-border-width) / 1.5) dotted var(--color-gray);

    ${BreakdownItemLabel} {
        font-weight: 600;
        font-size: 2rem;
        line-height: 2rem;
    }

    ${BreakdownItemMoney} {
        font-weight: 700;
        font-size: 2.5rem;
        line-height: 2.5rem;
    }
`;

const BreakdownDiscountItem = styled(BreakdownItem)`
    --discount-prefix: '-';
    ${BreakdownItemMoney} {
        z-index: 1;
        position: relative;
        color: var(--color-green);

        &::before {
            content: var(--discount-prefix);
        }

        &::after {
            content: '';
            z-index: -2;
            position: absolute;
            inset: calc(var(--block-padding-small) * -0.5);
            padding: 0px var(--block-padding-small);
            background: var(--color-green-light);
            color: var(--color-green);
            border-radius: var(--block-border-radius-tiny);
            pointer-events: none;
        }
    }
`;

const Header = styled(BreakdownItem)`
    ${Label} {
        font-size: 2rem;
        line-height: 2.25rem;
        font-weight: 700;
    }

    ${BreakdownItemLabel} {
        font-size: 2rem;
        line-height: 2.25rem;
        font-weight: 500;
    }
`;

interface CartSummaryProps {
    onCheckout: any;
    freeShipping?: boolean;
    showLoader?: boolean;
}
export const CartSummary: FunctionComponent<CartSummaryProps> = ({ onCheckout, freeShipping, showLoader }) => {
    const { t } = useTranslation('cart');
    const { totalQuantity, status, lines, cost, note } = useCart();
    const [showNote, setShowNote] = useState(false);
    const loading = showLoader || status !== 'idle';

    useEffect(() => {
        if (!note || showNote) return;

        setShowNote(showNote);
    }, [note]);

    if (status === 'creating') {
        return (
            <Container>
                <Block>
                    <PageLoader />
                </Block>
            </Container>
        );
    }

    const sale =
        lines?.reduce(
            (sum, line) =>
                (line?.cost?.compareAtAmountPerQuantity &&
                    sum +
                        ((Number.parseFloat(line?.cost?.compareAtAmountPerQuantity?.amount!) || 0) *
                            (line?.quantity || 0) -
                            Number.parseFloat(line.cost.totalAmount?.amount!))) ||
                sum,
            0
        ) || 0;
    const salePercentage = Math.round(((100 * sale) / Number.parseFloat(cost?.totalAmount?.amount || '0')) * 100) / 100;

    const promos =
        Number.parseFloat(cost?.subtotalAmount?.amount!) - Number.parseFloat(cost?.totalAmount?.amount!) || 0;

    return (
        <Container>
            <Block>
                <Header>
                    <Label>{t('order-summary')}</Label>
                    <BreakdownItemLabel>
                        {totalQuantity} {Pluralize({ count: totalQuantity || 0, noun: 'item' })}
                    </BreakdownItemLabel>
                </Header>

                <CartCoupons />

                <FreeShipping />

                {(totalQuantity && !showNote && (
                    <Action onClick={() => setShowNote(true)}>
                        <FiEdit />
                        {` ${t('add-order-note')}`}
                    </Action>
                )) ||
                    null}
            </Block>

            {(totalQuantity && showNote && (
                <SmallBlock>
                    <CartNote />
                </SmallBlock>
            )) ||
                null}

            {(totalQuantity && status !== 'uninitialized' && (
                <Block>
                    <Breakdown>
                        <BreakdownItem>
                            <BreakdownItemLabel>{t('subtotal')}</BreakdownItemLabel>
                            {(cost?.subtotalAmount && (
                                <Money
                                    as={BreakdownItemMoney}
                                    data={{
                                        currencyCode: cost?.subtotalAmount?.currencyCode,
                                        amount:
                                            (sale &&
                                                (Number.parseFloat(cost?.subtotalAmount?.amount!) + sale).toString()) ||
                                            cost?.subtotalAmount?.amount
                                    }}
                                />
                            )) ||
                                null}
                        </BreakdownItem>

                        {(sale && (
                            <BreakdownDiscountItem title={`${salePercentage}% OFF`}>
                                <BreakdownItemLabel>{t('sale-discount')}</BreakdownItemLabel>
                                <Money
                                    as={BreakdownItemMoney}
                                    data={{
                                        currencyCode: cost?.totalAmount?.currencyCode,
                                        amount: sale.toString()
                                    }}
                                />
                            </BreakdownDiscountItem>
                        )) ||
                            null}

                        {(promos && (
                            <BreakdownDiscountItem>
                                <BreakdownItemLabel>{t('promo-codes')}</BreakdownItemLabel>
                                <Money
                                    as={BreakdownItemMoney}
                                    data={{
                                        currencyCode: cost?.totalAmount?.currencyCode,
                                        amount: promos.toString()
                                    }}
                                />
                            </BreakdownDiscountItem>
                        )) ||
                            null}

                        <BreakdownItem>
                            <BreakdownItemLabel>{t('shipping')}</BreakdownItemLabel>

                            {(freeShipping && (
                                <Money
                                    as={BreakdownItemMoney}
                                    data={{
                                        currencyCode: cost?.subtotalAmount?.currencyCode,
                                        amount: (0).toString()
                                    }}
                                />
                            )) || <BreakdownItemMoney>{'TBD*'}</BreakdownItemMoney>}
                        </BreakdownItem>

                        <BreakdownTotalItem>
                            <BreakdownItemLabel>{t('estimated-total')}</BreakdownItemLabel>
                            <CartCost as={BreakdownItemMoney} />
                        </BreakdownTotalItem>

                        {(!freeShipping && (
                            <BreakdownItem>
                                <Notice>{`*${t('shipping-calculated-at-checkout')}`}</Notice>
                            </BreakdownItem>
                        )) ||
                            null}
                    </Breakdown>

                    {(!loading && (
                        <CheckoutButton disabled={(totalQuantity || 0) <= 0 || !lines} onClick={onCheckout}>
                            <Label>{t('continue-to-checkout')}</Label>
                            <CheckoutButtonIcon>
                                <FiChevronRight />
                            </CheckoutButtonIcon>
                        </CheckoutButton>
                    )) || (
                        <Center>
                            <PageLoader />
                        </Center>
                    )}

                    <BreakdownItem style={{ marginTop: 'var(--block-spacer-small)' }}>
                        <Notice>
                            <FiLock className="Lock" />
                            Safely complete your purchase through our secure and{' '}
                            <Link href="https://www.shopify.com/security/pci-compliant" rel="nofollow" target="_blank">
                                PCI DSS compliant
                            </Link>{' '}
                            checkout powered by Stripe & Shopify.
                        </Notice>
                    </BreakdownItem>
                </Block>
            )) ||
                null}
        </Container>
    );
};
