import { FunctionComponent, useEffect, useState } from 'react';
import styled, { css } from 'styled-components';

import { useProduct } from '@shopify/hydrogen-react';
import { useRouter } from 'next/router';

//import { useRouter } from 'next/router';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer);
    margin-bottom: 1rem;

    &:empty {
        display: none;
    }
`;
const OptionTitle = styled.div`
    margin-bottom: 0.5rem;
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
    padding: var(--block-padding) var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--color-block);
    color: var(--color-dark);
    text-align: center;
    font-size: 1.25rem;
    font-weight: 600;
    transition: 250ms ease-in-out;
    cursor: pointer;

    ${({ selected }) =>
        selected &&
        css`
            background: var(--accent-primary);
            color: var(--accent-primary-text);
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
                        color: var(--accent-primary-text);
                        background: var(--accent-primary);
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
    }, [router]);

    return (
        <Container>
            {options?.map((option) => {
                if (!option || !option.values || !option.name || option.values.length <= 1)
                    return null;

                return (
                    <Option key={option.name} disabled={disabled}>
                        <OptionTitle>{option.name}</OptionTitle>
                        <OptionValues>
                            {option.values.map((value) => {
                                // TODO: Disable options that aren't purchasable available, ie out of stock.
                                return (
                                    <OptionValue
                                        key={value}
                                        //disabled={!inStock}
                                        selected={selectedOptions?.[option.name!] === value}
                                        onClick={() =>
                                            onOptionChange({
                                                name: option.name!,
                                                value: value!
                                            })
                                        }
                                    >
                                        {value}
                                    </OptionValue>
                                );
                            })}
                        </OptionValues>
                    </Option>
                );
            })}
        </Container>
    );
};
