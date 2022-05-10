import React, { FunctionComponent, memo } from 'react';

interface CartHeaderProps {}
const CartHeader: FunctionComponent<CartHeaderProps> = (props) => {
    return <div className="CartHeader"></div>;
};

export default memo(CartHeader);
