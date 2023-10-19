import styled, { css } from 'styled-components';

import { FiPackage } from 'react-icons/fi';
import type { FunctionComponent } from 'react';
import type { Product } from '@shopify/hydrogen-react/storefront-api-types';

type Status = 'good' | 'warning' | 'error';

const Container = styled.section`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    margin-top: calc(var(--block-padding-small) * -1);
    margin-bottom: var(--block-padding-large);

    &:empty {
        display: none;
    }
`;

const Entry = styled.div<{ $status: Status }>`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    padding: 0 var(--block-padding-small);
    gap: 0.25rem;
    height: 2rem;
    //background: var(--color-block);
    border-radius: 6rem;
    user-select: none;

    ${({ $status }) => {
        switch ($status) {
            case 'good':
                return css`
                    color: var(--color-success-light);
                    //background: var(--color-block-pastel-lime-light);
                `;
            case 'warning':
                return '';
            case 'error':
                return '';
            default:
                return '';
        }
    }}
`;

const Icon = styled.div`
    font-weight: 600;
    font-size: 1.5rem;
    line-height: 1.5rem;
`;
const Label = styled.div`
    font-weight: 600;
    font-size: 1.5rem;
    line-height: 2rem;
`;

interface StockStatusProps {
    product: Product;
}
export const StockStatus: FunctionComponent<StockStatusProps> = ({ product }) => {
    if (!product || !product.availableForSale) return null;

    // TODO: proper i18n
    const available = `In stock and available`;
    //const fewAvailable = `Limited amount in stock`;

    return (
        <Entry $status="good" title={available}>
            <Icon>
                <FiPackage />
            </Icon>
            <Label>{available}</Label>
        </Entry>
    );
};

interface InfoLinesProps {
    product: Product;
}
export const InfoLines: FunctionComponent<InfoLinesProps> = ({ product }) => {
    if (!product) return null;

    return (
        <Container>
            <StockStatus product={product} />
        </Container>
    );
};
