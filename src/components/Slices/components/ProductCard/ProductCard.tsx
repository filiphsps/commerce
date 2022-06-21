import React, { FunctionComponent, memo } from 'react';

import ProductCardComponent from '../../../ProductCard';

interface ProductCardProps {
    data?: any;
}
const ProductCard: FunctionComponent<ProductCardProps> = (props) => {
    return <ProductCardComponent handle={props?.data?.handle} />;
};

export default memo(ProductCard);
