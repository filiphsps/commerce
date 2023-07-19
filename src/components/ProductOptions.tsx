import styled, { css } from 'styled-components';

import { FunctionComponent } from 'react';
import { useProduct } from '@shopify/hydrogen-react';

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
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.25rem;
    max-width: 18rem;
    padding: var(--block-padding) var(--block-padding-large);
    margin: 0px 0px 0.5rem 0px;
    text-transform: uppercase;
    background: var(--color-bright);
    border: 0.2rem solid var(--color-bright);
    border-radius: var(--block-border-radius);
    font-weight: 600;
    cursor: pointer;
    transition: 250ms all ease-in-out;
    box-shadow: 0px 0px 1rem 0px var(--color-block-shadow);

    @media (max-width: 950px) {
        font-size: 1.5rem;
    }

    ${(props) =>
        props.selected &&
        css`
             {
                color: var(--accent-primary);
                border-color: var(--accent-primary);
            }
        `}

    @media (min-width: 950px) {
        &:hover {
            color: var(--accent-primary);
            border-color: var(--accent-primary);
        }
    }
`;
const Option = styled.div``;

interface ProductOptionProps {}
export const ProductOptions: FunctionComponent<ProductOptionProps> = ({}) => {
    const { setSelectedOption, options, selectedOptions } = useProduct();
    /*const router = useRouter();

    const prevVariantId = usePrevious(selectedVariant?.id);
    useEffect(() => {
        if (!selectedVariant?.id || selectedVariant?.id === prevVariantId || !router.isReady)
            return;

        console.log(router.query.variant, selectedVariant.id);

        return;
    }, [selectedVariant]);*/

    return (
        <Container>
            {options?.map((option) => {
                if (!option || !option.values || !option.name || option.values.length <= 1)
                    return null;

                return (
                    <Option key={option.name}>
                        <OptionTitle>{option.name}</OptionTitle>
                        <OptionValues>
                            {option.values.map((value) => (
                                <OptionValue
                                    key={value}
                                    selected={selectedOptions?.[option.name!] === value}
                                    onClick={() => setSelectedOption(option.name!, value!)}
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
