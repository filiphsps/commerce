import React, { FunctionComponent, memo, useEffect, useState } from 'react';

import LanguageString from '../LanguageString';
import { ProductModel } from '../../models/ProductModel';
import styled from 'styled-components';

const FilterWrapper = styled.div`
    margin: 0px 0px 2rem 0px;
`;
const Filter = styled.div`
    display: flex;
    flex-direction: row;
    grid-gap: 2rem;
    transition: 250ms;

    &.Closed {
        opacity: 0;
        height: 0px;
        pointer-events: none;
    }
`;
const Toggle = styled.div`
    cursor: pointer;
    text-transform: uppercase;
    font-size: 1.25rem;
    font-weight: 600;
    user-select: none;
    opacity: 0.65;
    transition: 250ms;

    &.Open {
        color: var(--accent-primary);
        border-left: 0.2rem solid var(--accent-primary);
        padding-left: 0.25rem;
        opacity: 1;
        margin-bottom: 2rem;
    }
`;

const Options = styled.div`
    display: flex;
    flex-direction: column;
    grid-gap: 0.5rem;
`;

const Option = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    grid-gap: 1rem;
    align-items: center;
    font-size: 1.25rem;
    text-transform: uppercase;
    cursor: pointer;
    user-select: none;
    opacity: 0.65;
    transition: 250ms;

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
    products: ProductModel[];
    onChange: (filter: any) => void;
}
const ProductFilter: FunctionComponent<ProductFilterProps> = ({
    products,
    onChange
}) => {
    const [filters, setFilters] = useState({ tags: [], vendors: [] });
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [tags, setTags] = useState<string[]>([]);
    const [vendors, setVendors] = useState<string[]>([]);

    useEffect(() => {
        let new_tags = [];
        let new_vendors = [];

        if (!products) return;

        products?.forEach((product) => {
            new_tags.push(...product.tags);
            new_vendors.push(product.vendor.title);
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
                className={showFilters && 'Open'}
            >
                <LanguageString id="filter_show" />
            </Toggle>
            <Filter className={!showFilters && 'Closed'}>
                <Options>
                    <OptionsTitle>
                        <LanguageString id="tags" />
                    </OptionsTitle>
                    {tags.sort().map((item) => (
                        <Option
                            key={`tags_${item}`}
                            className={
                                filters.tags.includes(item) && 'Selected'
                            }
                            onClick={() => {
                                let new_filter = filters.tags;

                                if (filters.tags.includes(item))
                                    new_filter = filters.tags.filter(
                                        (tag) => tag !== item
                                    );
                                else new_filter = [...filters.tags, item];

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
                    <OptionsTitle>
                        <LanguageString id="brand" />
                    </OptionsTitle>
                    {vendors.sort().map((item) => (
                        <Option
                            key={`brand_${item}`}
                            className={
                                filters.vendors.includes(item) && 'Selected'
                            }
                            onClick={() => {
                                let new_filter = filters.vendors;

                                if (filters.vendors.includes(item))
                                    new_filter = filters.vendors.filter(
                                        (tag) => tag !== item
                                    );
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
        </FilterWrapper>
    );
};

export default memo(ProductFilter);
