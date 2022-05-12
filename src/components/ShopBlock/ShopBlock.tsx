import React, { FunctionComponent, memo, useEffect, useState } from 'react';

import LanguageString from '../LanguageString';
import Loader from '../Loader';
import ProductCard from '../ProductCard';
import { ProductsApi } from '../../api';
import Vendors from '../Vendors';
import useSWR from 'swr';

interface ShopBlockProps {
    store?: any;
    data?: any;
}
const ShopBlock: FunctionComponent<ShopBlockProps> = (props) => {
    const { data, error } = useSWR([``], () => ProductsApi(), {
        fallbackData: props?.data
    }) as any;

    return (
        <div className="ShopBlock">
            <Vendors />
            {(data && (
                <div className={`CollectionBlock CollectionBlock-Grid`}>
                    <div className="CollectionBlock-Content">
                        {data?.items?.map((product) => {
                            return (
                                <ProductCard
                                    key={product?.handle}
                                    data={product || undefined}
                                    handle={product?.handle}
                                />
                            );
                        })}

                        {!data?.items?.length && (
                            <LanguageString id="search_no_results" />
                        )}
                    </div>
                </div>
            )) || <Loader />}
        </div>
    );
};

export default memo(ShopBlock);
