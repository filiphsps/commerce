import React, { FunctionComponent, memo } from 'react';

import LanguageString from '../LanguageString';
import Loader from '../Loader';
import ProductCard from '../ProductCard';
import ProductFilter from '../ProductFilter';
import Vendors from '../Vendors';

interface ShopBlockProps {
    store?: any;
    data?: any;
}
const ShopBlock: FunctionComponent<ShopBlockProps> = ({ data }) => {
    return (
        <div className="ShopBlock">
            <Vendors />
            {data && <ProductFilter products={data} />}
            {(data && (
                <div className={`CollectionBlock CollectionBlock-Grid`}>
                    <div className="CollectionBlock-Content">
                        {data?.map((product) => {
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
