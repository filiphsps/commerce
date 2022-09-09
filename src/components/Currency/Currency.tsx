import React, { FunctionComponent, useEffect, useState } from 'react';

import { Convert } from 'easy-currencies';
import { StoreModel } from '../../models/StoreModel';
import { Currency as Tender } from 'react-tender';
import { getParamByISO } from 'iso-country-currency';
import useCountry from '../../hooks/country';

interface CurrencyProps {
    price?: number;
    suffix?: any;
    prefix?: any;

    currency?: string;
    className?: string;
    store?: StoreModel;
}
const Currency: FunctionComponent<CurrencyProps> = (props) => {
    const country = useCountry();
    const [currency, setCurrency] = useState(
        props.currency || props?.store?.currencies[0] || 'USD'
    );
    const [price, setPrice] = useState(
        Number.parseFloat(props.price as any) || 0
    );

    useEffect(() => {
        if (price !== props.price) {
            setPrice(Number.parseFloat(props.price as any) || 0);
            setCurrency(props.currency || props?.store?.currencies[0] || 'USD');
        }

        if (!country.code) return;
        const new_currency = getParamByISO(country.code, 'currency');

        if (new_currency === currency) return;
        setCurrency(new_currency);

        // FIXME: Round to .45 or .95
        // FIXME: Cache.
        Convert(props.price)
            .from(props.currency || 'USD')
            .to(new_currency)
            .then((value) => {
                setPrice(value);
            });
    }, [country.code, props.price, props.currency]);

    return (
        <div className={`Currency ${props.className || ''}`}>
            {props.prefix && (
                <span className="Currency-Prefix">{props.prefix}</span>
            )}
            <Tender value={price} currency={currency} />
            {props.suffix && (
                <span className="Currency-Suffix">{props.suffix}</span>
            )}
        </div>
    );
};

export default Currency;
