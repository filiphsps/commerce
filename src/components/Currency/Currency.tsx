import React, { FunctionComponent, memo, useEffect, useState } from 'react';

import { Currency as Tender } from 'react-tender';
import currencyConverter from '@techhof-ab/currency-converter';
import { useStore } from 'react-context-hook';

interface CurrencyProps {
    price?: any;
    suffix?: any;
    prefix?: any;

    currency?: string;
    className?: string;
}
const Currency: FunctionComponent<CurrencyProps> = (props) => {
    const [store] = useStore<any>('store');
    const [currency] = useStore<any>('currency');
    const [price, setPrice] = useState(props?.price || 0);

    useEffect(() => {
        if (!store || !store?.currency) return;

        if (!props?.price) {
            setPrice(0);
            return;
        }

        if (
            currency !== (props?.currency || store?.currency) &&
            !(!(props?.currency || store?.currency) || !currency)
        ) {
            // Add 2% when converting currency to account for currency conversion fees
            currencyConverter(
                parseFloat(`${props?.price}`) * 1.02,
                props?.currency || store?.currency,
                currency,
                `latest`
            ).then((res) => {
                setPrice(res?.conversion_amount || price);
            });
        } else {
            setPrice(parseFloat(`${props?.price}`));
        }
    }, [store, props, currency]);

    return (
        <div className={`Currency ${props.className || ''}`}>
            {props.prefix && (
                <span className="Currency-Prefix">{props.prefix}</span>
            )}
            <Tender
                value={Number.parseFloat(price) || 0}
                currency={
                    currency || props?.currency || store?.currency || 'USD'
                }
            />
            {props.suffix && (
                <span className="Currency-Suffix">{props.suffix}</span>
            )}
        </div>
    );
};

export default memo(Currency);
