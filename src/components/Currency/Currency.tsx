import React, { FunctionComponent, useEffect, useState } from 'react';

import { Converter } from 'easy-currencies';
import { StoreModel } from '../../models/StoreModel';
import { Currency as Tender } from 'react-tender';
import { getParamByISO } from 'iso-country-currency';
import { useStore } from 'react-context-hook';

interface CurrencyProps {
    price?: number;
    suffix?: any;
    prefix?: any;

    currency?: string;
    className?: string;
    store?: StoreModel;
}
const Currency: FunctionComponent<CurrencyProps> = (props) => {
    const [rates, setRates] = useStore('rates');
    const [country] = useStore('country');
    const [currency, setCurrency] = useState(
        props.currency || props?.store?.currencies[0] || 'USD'
    );
    const [price, setPrice] = useState(
        Number.parseFloat(props.price as any) || 0
    );

    useEffect(() => {
        setPrice(props.price);
        setCurrency(props.currency || props?.store?.currencies[0] || 'USD');

        if (!country) return;
        const new_currency: string = getParamByISO(country, 'currency');
        setCurrency(new_currency);

        (async () => {
            const converter = new Converter();

            const current_rates = rates;
            if (!current_rates[new_currency]) {
                current_rates[new_currency] = await converter.getRates(
                    'USD',
                    new_currency
                );
                setRates(current_rates);
            }

            const val = await converter.convert(
                props.price,
                props.currency || props?.store?.currencies[0] || 'USD',
                new_currency,
                current_rates[new_currency]
            );

            setPrice(val);
            setCurrency(new_currency);
        })();
    }, [country, rates, props.price, props.currency]);

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
