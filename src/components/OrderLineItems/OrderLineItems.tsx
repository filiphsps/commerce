import React, { FunctionComponent, memo } from 'react';

import Loader from '../Loader';

interface OrderLineItemsProps {
    data?: Array<{
        quantity: number;
        title: string;
    }>;
}
const OrderLineItems: FunctionComponent<OrderLineItemsProps> = (props) => {
    const { data } = props;

    if (!data) return <Loader />;

    return (
        <div className="OrderLineItems">
            {data?.map((line_item) => {
                return (
                    <div className="OrderLineItems-Item">
                        {line_item?.quantity}x {line_item?.title}
                    </div>
                );
            })}
        </div>
    );
};

export default memo(OrderLineItems);
