import React, { FunctionComponent, memo } from 'react';

import Currency from '../Currency';
import Loader from '../Loader';
import { OrdersApi } from '../../api';
import moment from 'moment';
import { useRouter } from 'next/router';
import useSWR from 'swr';

interface OrdersBlockProps {}
const OrdersBlock: FunctionComponent<OrdersBlockProps> = (props) => {
    const router = useRouter();
    const {
        data,
        error
    }: {
        data?: any;
        error?: any;
    } = useSWR([''], () => OrdersApi());

    if (!data) return <Loader />;

    return (
        <div className="OrdersBlock">
            {data?.map((order) => (
                <a
                    key={order?.id}
                    className="OrdersBlock-Order"
                    href={order?.status_url}
                    target="_blank"
                    rel="noreferrer"
                >
                    <div className="OrdersBlock-Order-Meta">
                        <div className="OrdersBlock-Order-Meta-Date">
                            {moment(order?.created_at).format('MMM Do, YYYY')}
                        </div>
                        <div className="OrdersBlock-Order-Meta-Name">
                            {order?.name}
                        </div>
                    </div>
                    <div className="OrdersBlock-Order-Price">
                        <div>
                            <Currency
                                price={order?.price}
                                currency={order?.currency}
                            />
                        </div>
                        <div>{order?.payment_status}</div>
                    </div>
                </a>
            ))}
        </div>
    );
};

export default memo(OrdersBlock);
