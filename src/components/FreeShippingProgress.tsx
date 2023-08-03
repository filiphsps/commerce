import { Money, useCart } from '@shopify/hydrogen-react';
import styled, { css } from 'styled-components';

import { FunctionComponent } from 'react';
import { useTranslation } from 'next-i18next';

const Container = styled.section<{ $active?: boolean }>`
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    gap: var(--block-spacer-small);
    color: var(--color-dark);
    transition: 250ms ease-in-out;

    ${({ $active }) =>
        $active &&
        css`
            border-radius: var(--block-border-radius);
            color: var(--color-green);
        `}
`;
const Label = styled.div`
    gap: var(--block-spacer-small);
    font-weight: 500;
    font-size: 1.5rem;
    line-height: 1.5rem;
`;
const Target = styled.span`
    font-weight: 700;
`;

const ProgressBarLine = styled.div`
    height: 100%;
    background: var(--accent-secondary-dark);
`;
const ProgressBar = styled.div<{ $full?: boolean }>`
    overflow: hidden;
    width: 100%;
    height: var(--block-padding);
    background: var(--color-bright);
    border-radius: var(--block-border-radius);

    ${({ $full }) =>
        $full &&
        css`
            ${ProgressBarLine} {
                background: var(--color-green);
            }
        `}
`;

interface FreeShippingProgressProps {
    className?: string;
    style?: React.CSSProperties;
}
export const FreeShippingProgress: FunctionComponent<FreeShippingProgressProps> = (props) => {
    const { cost, status } = useCart();
    const { t } = useTranslation('cart');

    if (status !== 'idle' && status !== 'updating') return null;

    // TODO: Handle other currencies properly
    let threshold = 85;
    switch (cost?.totalAmount?.currencyCode?.toUpperCase()) {
        case 'GBP':
            threshold = 70;
            break;
        case 'EUR':
            threshold = 80;
            break;
        case 'SEK':
            threshold = 900;
            break;
        case 'DKK':
            threshold = 575;
            break;
        case 'NOK':
            threshold = 875;
            break;
        case 'CAD':
            threshold = 115;
            break;
        default:
        case 'USD':
            threshold = 85;
            break;
    }
    const freeShipping = Number.parseFloat(cost?.totalAmount?.amount!) > threshold;
    const amountLeft = threshold - (Number.parseFloat(cost?.totalAmount?.amount!) || 0) || 0;

    // TODO: Figure out if we should still display something here
    if (freeShipping) return null;

    const amountLeftComponent =
        (cost?.totalAmount && (
            <Money
                as={Target}
                data={{
                    currencyCode: cost?.totalAmount?.currencyCode,
                    amount: amountLeft.toString()
                }}
            />
        )) ||
        null;

    return (
        <Container {...props} $active={freeShipping}>
            {
                <Label>
                    {amountLeftComponent}
                    {` ${t('away-from-getting')} `}
                    <Target>{t('free-shipping')}</Target>.
                </Label>
            }
            <ProgressBar $full={freeShipping}>
                <ProgressBarLine
                    style={{
                        width: `${
                            (freeShipping && 100) ||
                            ((Number.parseFloat(cost?.totalAmount?.amount!) || 0) / threshold) * 100
                        }%`
                    }}
                />
            </ProgressBar>
        </Container>
    );
};
