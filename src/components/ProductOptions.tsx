import styled, { css } from 'styled-components';

import { FunctionComponent } from 'react';
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

    ${(props) =>
        props.selected &&
        css`
            background: var(--accent-primary);
            color: var(--accent-primary-text);
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

interface ProductOptionProps {}
export const ProductOptions: FunctionComponent<ProductOptionProps> = ({}) => {
    const router = useRouter();
    const { setSelectedOption, options, selectedOptions } = useProduct();

    // TODO: Disable options that aren't purchasable available, ie out of stock.
    return (
        <Container>
            {options?.map((option) => {
                if (!option || !option.values || !option.name || option.values.length <= 1)
                    return null;

                const disabled = !router.isReady;
                return (
                    <Option key={option.name} disabled={disabled}>
                        <OptionTitle>{option.name}</OptionTitle>
                        <OptionValues>
                            {option.values.map((value) => (
                                <OptionValue
                                    key={value}
                                    selected={selectedOptions?.[option.name!] === value}
                                    onClick={() =>
                                        !disabled && setSelectedOption(option.name!, value!)
                                    }
                                >
                                    {value}
                                </OptionValue>
                            ))}
                        </OptionValues>
                    </Option>
                );
            })}
        </Container>
    );
};
