import React, { FunctionComponent, memo, useState } from 'react';

import LanguageString from '../LanguageString';
import Loader from '../Loader';
import ProductCard from '../ProductCard';
import ProductFilter from '../ProductFilter';
import styled from 'styled-components';

const ShopBlockWrapper = styled.div`
    display: grid;
    grid-template-columns: 1fr 12rem;
    grid-gap: 2rem;

    @media (max-width: 720px) {
        grid-template-columns: 1fr;

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
    const [filter, setFilter] = useState({
        tags: [],
        vendors: [],
        sorting: 'none'
    });

    return (
        <ShopBlockWrapper className="ShopBlock">
            {(data && (
                <div className={`CollectionBlock CollectionBlock-Grid`}>
                    <div className="CollectionBlock-Content">
                        {data
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
                                        return;
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

                        {!data?.length && (
                            <LanguageString id="search_no_results" />
                        )}
                    </div>
                </div>
            )) || <Loader />}
            {data && (
                <ProductFilter
                    products={data}
                    onChange={(filter) => setFilter(filter)}
                />
            )}
        </ShopBlockWrapper>
    );
};

export default memo(ShopBlock);
