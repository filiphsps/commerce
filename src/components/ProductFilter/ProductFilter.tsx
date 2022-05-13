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
`;
const Toggle = styled.div`
    cursor: pointer;
    text-transform: uppercase;
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
    padding: 0.5rem 1rem;
    font-size: 1.25rem;
    text-transform: uppercase;
    background: #efefef;
    border-radius: var(--block-border-radius);
    cursor: pointer;
`;
const OptionsTitle = styled.div`
    padding-bottom: 0.5rem;
    text-transform: uppercase;
    font-size: 1.5rem;
    font-weight: 900;
    opacity: 0.65;
`;

interface ProductFilterProps {
    products: ProductModel[];
}
const ProductFilter: FunctionComponent<ProductFilterProps> = ({ products }) => {
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [tags, setTags] = useState<string[]>([]);
    const [vendors, setVendors] = useState<string[]>([]);

    useEffect(() => {
        let new_tags = [];
        let new_vendors = [];

        products.forEach((product) => {
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

    return (
        <FilterWrapper>
            {!showFilters && (
                <Toggle onClick={() => setShowFilters(!showFilters)}>
                    <LanguageString id="filter_show" />
                </Toggle>
            )}
            {showFilters && (
                <Filter>
                    <Options>
                        <OptionsTitle>
                            <LanguageString id="brand" />
                        </OptionsTitle>
                        {tags.map((item) => (
                            <Option>{item}</Option>
                        ))}
                    </Options>

                    <Options>
                        <OptionsTitle>
                            <LanguageString id="tag" />
                        </OptionsTitle>
                        {vendors.map((item) => (
                            <Option>{item}</Option>
                        ))}
                    </Options>

                    <Options>
                        <OptionsTitle>
                            <LanguageString id="price" />
                        </OptionsTitle>
                    </Options>
                </Filter>
            )}
        </FilterWrapper>
    );
};

export default memo(ProductFilter);
