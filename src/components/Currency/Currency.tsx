import React, { FunctionComponent, memo } from 'react';

import { StoreModel } from '../../models/StoreModel';
import { Currency as Tender } from 'react-tender';
import { useStore } from 'react-context-hook';

interface CurrencyProps {
    price?: any;
    suffix?: any;
    prefix?: any;

    currency?: string;
    className?: string;
    store?: StoreModel;
}
const Currency: FunctionComponent<CurrencyProps> = (props) => {
    const [currency] = useStore<any>('currency');

    return (
        <div className={`Currency ${props.className || ''}`}>
            {props.prefix && (
                <span className="Currency-Prefix">{props.prefix}</span>
            )}
            <Tender
                value={Number.parseFloat(props?.price) || 0}
                currency={
                    props?.currency ||
                    props?.store?.currency ||
                    currency ||
                    'USD'
                }
            />
            {props.suffix && (
                <span className="Currency-Suffix">{props.suffix}</span>
            )}
        </div>
    );
};

export default memo(Currency);
