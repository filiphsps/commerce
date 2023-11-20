import { Money, useCart } from '@shopify/hydrogen-react';
import styled, { css } from 'styled-components';

import { useTranslation, type LocaleDictionary } from '@/utils/locale';
import { RemoveInvalidProps } from '@/utils/remove-invalid-props';
import type { FunctionComponent } from 'react';

const Container = styled.section<{ $active?: boolean }>`
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    gap: var(--block-spacer-small);
    color: var(--color-dark);
    transition: 150ms ease-in-out;

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
    i18n: LocaleDictionary;
}
export const FreeShippingProgress: FunctionComponent<FreeShippingProgressProps> = (props) => {
    const { cost } = useCart();
    const { t } = useTranslation('cart', props.i18n);

    // TODO: Handle other currencies properly.
    let threshold = 95;
    switch (cost?.totalAmount?.currencyCode?.toUpperCase()) {
        case 'GBP':
            threshold = 80;
            break;
        case 'EUR':
            threshold = 95;
            break;
        case 'SEK':
            threshold = 1050;
            break;
        case 'DKK':
            threshold = 685;
            break;
        case 'NOK':
            threshold = 1075;
            break;
        case 'CAD':
            threshold = 135;
            break;
        default:
        case 'USD':
            threshold = 95;
            break;
    }
    const freeShipping = Number.parseFloat(cost?.totalAmount?.amount!) > threshold;
    const amountLeft = threshold - (Number.parseFloat(cost?.totalAmount?.amount!) || 0) || 0;

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
        <Container {...RemoveInvalidProps(props)} $active={freeShipping}>
            {
                <Label suppressHydrationWarning>
                    {amountLeftComponent}
                    {` ${t('away-from-getting')} `}
                    <Target suppressHydrationWarning>{t('free-shipping')}</Target>.
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
