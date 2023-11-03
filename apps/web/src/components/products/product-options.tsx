'use client';

import { ConvertToLocalMeasurementSystem } from '@/api/shopify/product';
import type { Locale } from '@/utils/locale';
import styled from 'styled-components';
import { useProduct } from '@shopify/hydrogen-react';

const OptionTitle = styled.div`
    text-transform: uppercase;
    font-weight: 700;
    font-size: 1.5rem;
    color: var(--color-block);
    color: var(--foreground);
`;
const OptionValues = styled.div`
    display: flex;
    gap: var(--block-spacer);
`;

// TODO: This should be a button, not a div.
const OptionValue = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer-small);
    justify-content: center;
    align-items: center;
    height: 3.75rem;
    padding: 0 calc(var(--block-padding-large) - var(--block-border-width));
    border: var(--block-border-width) solid var(--color-block);
    border-radius: var(--block-border-radius);
    background: var(--color-block);
    color: var(--color-dark);
    text-align: center;
    font-size: 1.25rem;
    font-weight: 700;
    transition: 150ms ease-in-out;
    cursor: pointer;

    @media (min-width: 950px) {
        height: 4.25rem;
    }

    &.Selected {
        border-color: var(--accent-primary-dark);
        color: var(--accent-primary-dark);
    }

    &.Disabled {
        opacity: 0.5;
        pointer-events: none;

        background: var(--color-block);
        color: var(--color-dark);

        @media (hover: hover) and (pointer: fine) {
            &:hover {
                color: inherit;
                background: inherit;
            }
        }
    }
`;
const Option = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer-small);
    opacity: 0.5;

    ${OptionValue} {
        cursor: pointer;

        @media (hover: hover) and (pointer: fine) {
            &:hover {
                color: var(--accent-primary);
                border-color: var(--accent-primary-dark);
            }
        }
    }

    &.Disabled {
        opacity: 0.5;
        pointer-events: none;
    }
`;

export type ProductOptionProps = {
    locale: Locale;
    // eslint-disable-next-line no-unused-vars, unused-imports/no-unused-vars
    onOptionChange?: (props: { name: string; value: string }) => void;
};
export const ProductOptions = ({ locale, onOptionChange }: ProductOptionProps) => {
    const { options, selectedOptions } = useProduct();

    return options?.map(
        (option) =>
            option?.values && (
                <Option key={option.name}>
                    <OptionTitle>{option.name}</OptionTitle>
                    <OptionValues>
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
                                    className={(selectedOptions?.[option.name!] === value && 'Selected') || ''}
                                    onClick={() =>
                                        onOptionChange?.({
                                            name: option.name!,
                                            value: value!
                                        })
                                    }
                                >
                                    {title}
                                </OptionValue>
                            );
                        })}
                    </OptionValues>
                </Option>
            )
    );
};
