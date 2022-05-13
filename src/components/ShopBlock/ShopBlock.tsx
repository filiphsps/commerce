import React, { FunctionComponent, memo, useState } from 'react';

import LanguageString from '../LanguageString';
import Loader from '../Loader';
import ProductCard from '../ProductCard';
import ProductFilter from '../ProductFilter';

interface ShopBlockProps {
    store?: any;
    data?: any;
}
const ShopBlock: FunctionComponent<ShopBlockProps> = ({ data }) => {
    const [filter, setFilter] = useState({ tags: [], vendors: [] });

    return (
        <div className="ShopBlock">
            {data && (
                <ProductFilter
                    products={data}
                    onChange={(filter) => setFilter(filter)}
                />
            )}
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
        </div>
    );
};

export default memo(ShopBlock);
