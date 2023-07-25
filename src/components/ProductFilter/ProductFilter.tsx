import { FunctionComponent, useEffect, useState } from 'react';

import { Product } from '@shopify/hydrogen-react/storefront-api-types';
import styled from 'styled-components';

const FilterWrapper = styled.div`
    position: relative;
    margin: 0px 0px 1rem 0px;
`;
const Filters = styled.div``;
const Filter = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    gap: 1.5rem;
    transition: 250ms all ease-in-out;

    @media (max-width: 950px) {
        flex-direction: row;

        &.Closed {
            opacity: 0;
            height: 0px;
            pointer-events: none;
        }
    }
`;
const Toggle = styled.div`
    cursor: pointer;
    user-select: none;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--block-padding);
    margin-bottom: -2rem;
    text-transform: uppercase;
    font-size: 1.25rem;
    background: #efefef;
    transition: 250ms all ease-in-out;
    border-radius: var(--block-border-radius);

    &.Open {
        background: var(--accent-primary);
        color: var(--accent-primary-text);
        opacity: 1;
        margin-bottom: 1rem;
    }

    @media (min-width: 950px) {
        display: none;
    }
`;

const Options = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--block-spacer-small);
`;

const Option = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--block-spacer);
    align-items: center;
    font-size: 1.25rem;
    text-transform: uppercase;
    cursor: pointer;
    user-select: none;
    opacity: 0.75;
    transition: 250ms all ease-in-out;

    &.Selected {
        color: var(--accent-primary);
        border-left: 0.2rem solid var(--accent-primary);
        padding-left: 0.25rem;
        font-weight: 600;
        opacity: 1;
    }
`;
const OptionsTitle = styled.div`
    padding-bottom: 0.5rem;
    text-transform: uppercase;
    font-size: 1.5rem;
    font-weight: 900;
`;

interface ProductFilterProps {
    products: Product[];
    // eslint-disable-next-line no-unused-vars
    onChange: (filter: any) => void;
}
const ProductFilter: FunctionComponent<ProductFilterProps> = ({ products, onChange }) => {
    const [filters, setFilters] = useState<any>({
        tags: [],
        vendors: [],
        sorting: 'none'
    });
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [tags, setTags] = useState<string[]>([]);
    const [vendors, setVendors] = useState<string[]>([]);
    // const [sorting, setSorting] = useState<string[]>([]);

    useEffect(() => {
        let new_tags: any[] = [];
        let new_vendors: any[] = [];

        if (!products) return;

        products?.forEach((product) => {
            new_tags.push(...(product.tags || []));
            new_vendors.push(product.vendor);
        });

        // Remove duplicates
        new_tags = [...new Set(new_tags)];
        new_vendors = [...new Set(new_vendors)];

        // Set the filters
        setTags(new_tags);
        setVendors(new_vendors);
    }, [products]);

    useEffect(() => {
        onChange(filters);
    }, [filters]);

    return (
        <FilterWrapper>
            <Toggle
                onClick={() => setShowFilters(!showFilters)}
                className={(showFilters && 'Open') || ''}
            >
                Filter products
            </Toggle>
            <Filters>
                <Filter className={(!showFilters && 'Closed') || ''}>
                    <Options>
                        <OptionsTitle>Sorting</OptionsTitle>
                        <Option
                            className={(filters.sorting == 'none' && 'Selected') || ''}
                            onClick={() => setFilters({ ...filters, sorting: 'none' })}
                        >
                            Popular
                        </Option>
                        <Option
                            className={(filters.sorting == 'abcAsc' && 'Selected') || ''}
                            onClick={() => setFilters({ ...filters, sorting: 'abcAsc' })}
                        >
                            Brand Asc.
                        </Option>
                    </Options>

                    <Options>
                        <OptionsTitle>Tags</OptionsTitle>
                        {tags.sort().map((item) => (
                            <Option
                                key={`tags_${item}`}
                                className={(filters.tags.includes(item) && 'Selected') || ''}
                                onClick={() => {
                                    let new_filter = filters.tags;

                                    if (filters.tags.includes(item))
                                        new_filter = filters.tags.filter((tag) => tag !== item);
                                    else new_filter = [...(filters.tags || []), item];

                                    setFilters({
                                        ...filters,
                                        tags: new_filter
                                    });
                                }}
                            >
                                {item}
                            </Option>
                        ))}
                    </Options>

                    <Options>
                        <OptionsTitle>Brand</OptionsTitle>
                        {vendors.sort().map((item) => (
                            <Option
                                key={`brand_${item}`}
                                className={filters.vendors.includes(item) && 'Selected'}
                                onClick={() => {
                                    let new_filter = filters.vendors;

                                    if (filters.vendors.includes(item))
                                        new_filter = filters.vendors.filter((tag) => tag !== item);
                                    else new_filter = [...filters.vendors, item];

                                    setFilters({
                                        ...filters,
                                        vendors: new_filter
                                    });
                                }}
                            >
                                {item}
                            </Option>
                        ))}
                    </Options>
                </Filter>
            </Filters>
        </FilterWrapper>
    );
};

export default ProductFilter;
