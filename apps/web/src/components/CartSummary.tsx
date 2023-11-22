import { CartCost, Money, useCart } from '@shopify/hydrogen-react';
import { useEffect, useState } from 'react';
import { FiChevronRight, FiEdit, FiLock } from 'react-icons/fi';

import { CartCoupons } from '@/components/CartCoupons';
import { CartNote } from '@/components/CartNote';
import { FreeShippingProgress } from '@/components/FreeShippingProgress';
import { Button } from '@/components/actionable/button';
import styles from '@/components/cart/cart-summary.module.scss';
import { LoadingIndicator } from '@/components/informational/loading-indicator';
import Link from '@/components/link';
import { Label } from '@/components/typography/label';
import { useTranslation, type LocaleDictionary } from '@/utils/locale';
import { Pluralize } from '@/utils/pluralize';
import type { FunctionComponent } from 'react';
import styled from 'styled-components';

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
    //background: var(--accent-secondary-light);
    background: var(--color-block);
    color: var(--color-dark);
    transition: 150ms ease-in-out;
`;
const SmallBlock = styled(Block)`
    padding: var(--block-padding);
    background: var(--color-block);
`;

const Notice = styled(Label)`
    font-size: 1.25rem;
    font-weight: 500;
    line-height: normal;
    text-transform: initial;

    .Lock {
        display: inline-block;
        font-size: 1.25rem;
        line-height: 0;
        margin: 0 0.25rem 0.15rem 0;
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
    transition: 150ms ease-in-out;

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
    width: 0;
    height: 100%;
    transition: 150ms ease-in-out;
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
        gap: 0;
        height: 5rem;
        padding: var(--block-padding-large);
        border-radius: var(--block-border-radius);
        font-size: 1.5rem;
        line-height: 1.5rem;

        &:not(:disabled):is(:hover, :active, :focus, :focus-within) {
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

const BreakdownItemMoney = styled.div`
    font-weight: 500;
    font-size: 1.5rem;
    line-height: 1.5rem;
    align-self: start;
`;
const BreakdownItem = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    grid-auto-rows: 1fr;
    gap: var(--block-spacer);
    align-items: end;
    justify-content: stretch;
    height: 100%;
    color: var(--color-dark);
`;

const BreakdownTotalItem = styled(BreakdownItem)`
    margin-top: var(--block-padding-small);
    padding: var(--block-padding-small) 0;
    border-top: calc(var(--block-border-width) / 1.5) dotted var(--color-gray);

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
            padding: 0 var(--block-padding-small);
            background: var(--color-green-light);
            color: var(--color-green);
            border-radius: var(--block-border-radius-tiny);
            pointer-events: none;
        }
    }
`;

const Header = styled(BreakdownItem)``;

interface CartSummaryProps {
    onCheckout: any;
    i18n: LocaleDictionary;
}
export const CartSummary: FunctionComponent<CartSummaryProps> = ({ onCheckout, i18n }) => {
    const { t } = useTranslation('cart', i18n);
    const { totalQuantity, status, lines, cost, note } = useCart();
    const [showNote, setShowNote] = useState(false);
    const loading = status !== 'idle';

    useEffect(() => {
        if (!note || showNote) return;

        setShowNote(showNote);
    }, [note]);

    if (['creating', 'fetching'].includes(status)) {
        return (
            <Container>
                <Block>
                    <LoadingIndicator />
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

    // TODO: Configurable.
    // TODO: Utility function.
    const freeShipping = Number.parseFloat(cost?.totalAmount?.amount!) >= 95;

    return (
        <Container>
            <Block>
                <Header>
                    <Label>{t('order-summary')}</Label>
                    <Label>
                        {totalQuantity} {Pluralize({ count: totalQuantity || 0, noun: 'item' })}
                    </Label>
                </Header>

                <CartCoupons />

                <FreeShipping i18n={i18n} />

                {!showNote ? (
                    <Action onClick={() => setShowNote(true)} className={styles['add-note']}>
                        <FiEdit />
                        {` ${t('add-order-note')}`}
                    </Action>
                ) : null}
            </Block>

            {showNote ? (
                <SmallBlock>
                    <CartNote />
                </SmallBlock>
            ) : null}

            {['idle', 'uninitialized'].includes(status) ? (
                <Block>
                    <div>
                        <BreakdownItem>
                            <Label>{t('subtotal')}</Label>
                            {cost?.subtotalAmount ? (
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
                            ) : null}
                        </BreakdownItem>

                        {sale ? (
                            <BreakdownDiscountItem title={`${salePercentage}% OFF`}>
                                <Label>{t('sale-discount')}</Label>
                                <Money
                                    as={BreakdownItemMoney}
                                    data={{
                                        currencyCode: cost?.totalAmount?.currencyCode,
                                        amount: sale.toString()
                                    }}
                                />
                            </BreakdownDiscountItem>
                        ) : null}

                        {promos ? (
                            <BreakdownDiscountItem>
                                <Label>{t('promo-codes')}</Label>
                                <Money
                                    as={BreakdownItemMoney}
                                    data={{
                                        currencyCode: cost?.totalAmount?.currencyCode,
                                        amount: promos.toString()
                                    }}
                                />
                            </BreakdownDiscountItem>
                        ) : null}

                        <BreakdownItem>
                            <Label>{t('shipping')}</Label>

                            {freeShipping ? (
                                <Money
                                    as={BreakdownItemMoney}
                                    data={{
                                        currencyCode: cost?.subtotalAmount?.currencyCode,
                                        amount: (0).toString()
                                    }}
                                />
                            ) : (
                                <BreakdownItemMoney>{'TBD*'}</BreakdownItemMoney>
                            )}
                        </BreakdownItem>

                        <BreakdownTotalItem>
                            <Label>{t('estimated-total')}</Label>
                            <CartCost as={BreakdownItemMoney} />
                        </BreakdownTotalItem>

                        {!freeShipping ? (
                            <BreakdownItem style={{ display: 'flex' }}>
                                <Notice>{`*${t('shipping-calculated-at-checkout')}`}</Notice>
                            </BreakdownItem>
                        ) : null}
                    </div>

                    {!loading && ((totalQuantity || 0) <= 0 || !lines) ? (
                        <CheckoutButton disabled={(totalQuantity || 0) <= 0 || !lines} onClick={onCheckout}>
                            <Label>{t('continue-to-checkout')}</Label>
                            <CheckoutButtonIcon>
                                <FiChevronRight />
                            </CheckoutButtonIcon>
                        </CheckoutButton>
                    ) : null}

                    <BreakdownItem style={{ marginTop: 'var(--block-spacer-small)', display: 'flex' }}>
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
            ) : null}
        </Container>
    );
};
