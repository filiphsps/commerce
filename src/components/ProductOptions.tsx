import styled, { css } from 'styled-components';
import { useEffect, useState } from 'react';

import { ConvertToLocalMeasurementSystem } from '@/api/product';
import type { FunctionComponent } from 'react';
import { useProduct } from '@shopify/hydrogen-react';
import { useRouter } from 'next/router';

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
const OptionValue = styled.div<{
    selected?: boolean;
    disabled?: boolean;
}>`
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
    transition: 250ms ease-in-out;
    cursor: pointer;

    @media (min-width: 950px) {
        height: 4.25rem;
    }

    ${({ selected }) =>
        selected &&
        css`
            border-color: var(--accent-primary-dark);
            color: var(--accent-primary-dark);
        `}

    ${({ disabled }) =>
        disabled &&
        css`
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
        `}
`;
const Option = styled.div<{ disabled: boolean }>`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer-small);
    opacity: 0.5;
    pointer-events: none;

    ${({ disabled }) =>
        !disabled &&
        css`
            opacity: unset;
            pointer-events: unset;

            ${OptionValue} {
                cursor: pointer;

                @media (hover: hover) and (pointer: fine) {
                    &:hover {
                        color: var(--accent-primary);
                        border-color: var(--accent-primary-dark);
                    }
                }
            }
        `}
`;

interface ProductOptionProps {
    // eslint-disable-next-line no-unused-vars
    onOptionChange: (props: { name: string; value: string }) => void;
}
export const ProductOptions: FunctionComponent<ProductOptionProps> = ({ onOptionChange }) => {
    const router = useRouter();
    const { options, selectedOptions } = useProduct();
    const [disabled, setDisabled] = useState(true);

    // We need this because of ssr
    useEffect(() => {
        if (disabled === !router.isReady) return;
        setDisabled(!router.isReady);
    }, [, router]);

    return (
        <>
            {options?.map((option) => {
                if (!option || !option.values || !option.name) return null;

                return (
                    <Option key={option.name} disabled={disabled}>
                        <OptionTitle>{option.name}</OptionTitle>
                        <OptionValues>
                            {option.values.map((value) => {
                                let title = value;

                                // Handle variants that should have their weight as their actual title
                                // FIXME: Remove `Size` when we've migrated to using Weight.
                                // FIXME: Remove incorrectly translated ones, eg  "Größe" & "Storlek".
                                if (['Size', 'Weight', 'Größe', 'Storlek'].includes(option.name!)) {
                                    title = ConvertToLocalMeasurementSystem({
                                        locale: router.locale,
                                        weight: Number.parseFloat(value!.slice(0, -1)),
                                        weightUnit: 'GRAMS'
                                    });
                                }

                                // TODO: Disable options that aren't purchasable available, ie out of stock.
                                return (
                                    <OptionValue
                                        key={value}
                                        //disabled={!inStock}
                                        selected={!disabled && selectedOptions?.[option.name!] === value}
                                        onClick={() =>
                                            onOptionChange({
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
                );
            })}
        </>
    );
};
