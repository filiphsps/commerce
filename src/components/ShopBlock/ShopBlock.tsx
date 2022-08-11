import React, { FunctionComponent, memo, useState } from 'react';

import LanguageString from '../LanguageString';
import Loader from '../Loader';
import ProductCard from '../ProductCard';
import ProductFilter from '../ProductFilter';
import styled from 'styled-components';

const ShopBlockWrapper = styled.div`
    display: grid;
    grid-template-columns: 1fr 12rem;
    grid-gap: 1.5rem;

    @media (max-width: 950px) {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr;

        & > div:nth-child(2) {
            grid-row: 1;
        }
    }
`;

interface ShopBlockProps {
    store?: any;
    data?: any;
}
const ShopBlock: FunctionComponent<ShopBlockProps> = ({ data }) => {
    const { products } = data;
    const [filter, setFilter] = useState({
        tags: [],
        vendors: [],
        sorting: 'none'
    });

    return (
        <ShopBlockWrapper className="ShopBlock">
            {(products && (
                <div className={`CollectionBlock CollectionBlock-Grid`}>
                    <div className="CollectionBlock-Content">
                        {products
                            ?.filter?.((product) => {
                                if (
                                    !filter ||
                                    (filter.tags.length <= 0 &&
                                        filter.vendors.length <= 0)
                                )
                                    return true;

                                let result = true;
                                if (filter.tags.length > 0) {
                                    result = filter.tags.every((item) => {
                                        return product.tags.includes(item);
                                    });
                                }

                                if (result && filter.vendors.length > 0) {
                                    result = filter.vendors.includes(
                                        product.vendor.title
                                    );
                                }

                                return result;
                            })
                            .sort((a, b) => {
                                switch (filter.sorting) {
                                    case 'abcAsc':
                                        return a.vendor.handle.localeCompare(
                                            b.vendor.handle
                                        );
                                    case 'none':
                                    default:
                                        return null;
                                }
                            })
                            .map((product) => {
                                return (
                                    <ProductCard
                                        key={product?.id}
                                        data={product}
                                        handle={product?.handle}
                                    />
                                );
                            })}

                        {!products?.length && (
                            <LanguageString id="search_no_results" />
                        )}
                    </div>
                </div>
            )) || <Loader />}
            {products && (
                <ProductFilter
                    products={products}
                    onChange={(filter) => setFilter(filter)}
                />
            )}
        </ShopBlockWrapper>
    );
};

export default memo(ShopBlock);
