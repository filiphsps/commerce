'use client';

import { ConvertToLocalMeasurementSystem } from '@/api/shopify/product';
import styles from '@/components/products/product-actions-container.module.scss';
import type { Locale } from '@/utils/locale';
import { RemoveInvalidProps } from '@/utils/remove-invalid-props';
import { useProduct } from '@shopify/hydrogen-react';
import type { HTMLProps } from 'react';
import styled from 'styled-components';

const OptionValues = styled.div`
    display: grid;
    grid-auto-flow: column;
    grid-template-columns: repeat(auto-fit, minmax(6rem, min-content));
    grid-auto-rows: 1fr;
    gap: var(--block-spacer-small);
    height: 100%;
`;

const OptionValue = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer-small);
    justify-content: center;
    align-items: center;
    border: var(--block-border-width) solid var(--color-block);
    border-radius: var(--block-border-radius);
    color: var(--color-dark);
    text-align: center;
    font-size: 1.5rem;
    font-weight: 600;
    transition: 150ms ease-in-out;
    user-select: none;
    cursor: pointer;

    &:hover:not(.Selected),
    &:active,
    &:focus {
        border-color: var(--color-block-dark);
    }

    &.Selected {
        border-color: var(--accent-primary);
        color: var(--accent-primary);
        font-weight: 800;
    }

    &.Disabled,
    &:disabled {
        opacity: 0.5;
        pointer-events: none;

        background-color: var(--color-block);
        color: var(--color-dark);

        @media (hover: hover) and (pointer: fine) {
            &:hover {
                color: inherit;
                background: inherit;
            }
        }
    }
`;

export type ProductOptionProps = {
    locale: Locale;
} & HTMLProps<HTMLDivElement>;
export const ProductOptions = (props: ProductOptionProps) => {
    const { locale } = props;
    const { options, selectedOptions, setSelectedOptions, isOptionInStock } = useProduct();

    return (
        <>
            <div style={{ gridArea: 'option-labels' }}>
                {options?.map((option) =>
                    option?.values ? (
                        <label key={option.name} className={styles.label}>
                            {option.name}
                        </label>
                    ) : (
                        <div /> // Empty div to keep the grid layout
                    )
                )}
            </div>
            <div {...RemoveInvalidProps(props)}>
                {options?.map((option) =>
                    option?.values ? (
                        <OptionValues key={option.name}>
                            {option.values.map((value) => {
                                let title = value;

                                // Handle variants that should have their weight as their actual title
                                // FIXME: Remove `Size` when we've migrated to using Weight.
                                // FIXME: Remove incorrectly translated ones, eg  "Größe" & "Storlek".
                                if (['Size', 'Weight', 'Größe', 'Storlek'].includes(option.name!)) {
                                    title = ConvertToLocalMeasurementSystem({
                                        locale,
                                        weight: Number.parseFloat(value!.slice(0, -1)),
                                        weightUnit: 'GRAMS'
                                    });
                                }

                                // TODO: Disable options that aren't purchasable available, ie out of stock.
                                return (
                                    <OptionValue
                                        key={value}
                                        className={`${
                                            (selectedOptions?.[option.name!] === value && 'Selected') || ''
                                        } ${(!isOptionInStock(option.name!, value!) && 'Disabled') || ''}`}
                                        onClick={() =>
                                            setSelectedOptions({
                                                ...(selectedOptions as any),
                                                [option.name!]: value!
                                            })
                                        }
                                    >
                                        {title}
                                    </OptionValue>
                                );
                            })}
                        </OptionValues>
                    ) : (
                        <div /> // Empty div to keep the grid layout
                    )
                )}
            </div>
        </>
    );
};
