import styled, { css } from 'styled-components';

import type { FunctionComponent } from 'react';
import { Input } from '@/components/Input';
import { Label } from '@/components/Label';
import { useState } from 'react';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer);
    padding: var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--accent-primary);
    background: linear-gradient(320deg, var(--accent-primary) 0%, var(--accent-primary-dark) 100%);
    color: var(--accent-primary-text);
`;

const Filter = styled.div``;
const FilterLabel = styled(Label)``;

const Values = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: var(--block-spacer-small);
    margin-top: 1rem;

    @media (max-width: 950px) {
        margin: 1rem 0px 0.5rem 0px;
    }
`;
const ListOption = styled.div<{ selected?: boolean }>`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    background: var(--color-block);
    color: var(--color-dark);
    font-weight: 600;
    font-size: 1.25rem;
    line-height: 1.25rem;
    border-radius: var(--block-border-radius);

    ${({ selected }) =>
        selected &&
        css`
            background: var(--accent-primary);
            color: var(--accent-primary-text);
        `}
`;

const RangeOption = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer-small);
    width: 100%;

    ${Input} {
        width: 100%;
        background: var(--color-block);
    }
`;
const RangeLabels = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--block-spacer);
    padding: 0px 0.5rem;
    width: 100%;
`;
const RangeLabel = styled(FilterLabel)`
    font-size: 1.5rem;
    line-height: 1.5rem;
    font-weight: 600;
`;

interface FilterOptionsProps {
    filter: any;
    options: any;
    setOptions: any;
}
export const FilterOptions: FunctionComponent<FilterOptionsProps> = ({ filter, options, setOptions }) => {
    switch (filter.type) {
        case 'LIST': {
            return (
                <Values>
                    {filter.values.map((value: any) => (
                        <ListOption
                            key={value.id}
                            selected={options[filter.id] === value.id}
                            onClick={setOptions({
                                ...options,
                                [filter.id]: value.id
                            })}
                        >
                            {value.label}
                        </ListOption>
                    ))}
                </Values>
            );
        }
        case 'PRICE_RANGE': {
            return (
                <Values>
                    {filter.values.map((value: any) => {
                        const input = JSON.parse(value.input)[value.id.split('.').at(-1)];

                        return (
                            <RangeOption key={value.id}>
                                <Input type="range" min={input.min} max={input.max} step={0.5} />
                                <RangeLabels>
                                    <RangeLabel>{input.min}</RangeLabel>
                                    <RangeLabel>{input.max}</RangeLabel>
                                </RangeLabels>
                            </RangeOption>
                        );
                    })}
                </Values>
            );
        }

        // TODO: Handle this
        default: {
            return null;
        }
    }
};

interface ProductSearchFiltersProps {
    filters: any[];
    open?: boolean;
}
export const ProductSearchFilters: FunctionComponent<ProductSearchFiltersProps> = ({ filters, open }) => {
    const [options, setOptions] = useState<any>({});

    // TODO
    if (!open) return null;

    if (!filters) return null;

    return (
        <Container>
            {filters.map((filter) => (
                <Filter key={filter.id}>
                    <FilterLabel>{filter.label}</FilterLabel>
                    <FilterOptions filter={filter} options={options} setOptions={setOptions} />
                </Filter>
            ))}
        </Container>
    );
};
