import React, { FunctionComponent, useEffect, useState } from 'react';

import { Config } from '../../util/Config';
import { Converter } from 'easy-currencies';
import { StoreModel } from '../../models/StoreModel';
import { Currency as Tender } from 'react-tender';
import { getParamByISO } from 'iso-country-currency';
import { useRouter } from 'next/router';
import { useStore } from 'react-context-hook';

const tempGetInitialCurrencyAndValue = ({
    locale,
    currency,
    price
}: {
    locale: string;
    price: number;
    currency: string;
}) => {
    let targetCurrency: string | null = null;
    // TODO: Handle this during build
    // FIXME: This makes assumptions about supported currencies
    switch (locale) {
        case 'en-US':
            targetCurrency = 'USD';
            break;
        case 'en-GB':
            targetCurrency = 'GBP';
            break;
        case 'de-DE':
            targetCurrency = 'EUR';
            break;
        case 'de-CH':
            targetCurrency = 'CHF';
            break;
        case 'sv-SE':
            targetCurrency = 'SEK';
            break;
    }

    let roughConversion = price;
    if (currency || currency == targetCurrency)
        // TODO: getRates during ssg instead
        // FIXME: This gets outdated fast
        switch (targetCurrency) {
            case 'GBP':
                roughConversion *= 0.81;
                break;
            case 'EUR':
                roughConversion *= 0.93;
                break;
            case 'CHF':
                roughConversion *= 0.91;
                break;
            case 'SEK':
                roughConversion *= 10.81;
                break;
            case 'USD':
            default:
                break;
        }

    return [targetCurrency as string, roughConversion as number];
};

interface CurrencyProps {
    price?: number;
    suffix?: any;
    prefix?: any;

    currency?: string;
    className?: string;
    store: StoreModel;
}
const Currency: FunctionComponent<CurrencyProps> = (props) => {
    const router = useRouter();
    const country = router.locale?.split('-')[1] || 'US';

    const [rates, setRates] = useStore('rates');

    const [targetCurrency, roughConversion] = tempGetInitialCurrencyAndValue({
        locale: router.locale || Config.i18n.locales[0],
        currency: props.currency || props?.store?.currencies?.[0] || 'USD',
        price: props.price || 0
    }) as [string, number];

    const [currency, setCurrency] = useState<string>(
        targetCurrency || props.currency || props?.store?.currencies[0] || 'USD'
    );

    const [price, setPrice] = useState<number>(roughConversion as number);

    useEffect(() => {
        if (!router.locale || !props.store) return;

        if (price == 0 || !price) setPrice(props.price || 0);
        if (!currency)
            setCurrency(props.currency || props?.store?.currencies[0] || 'USD');

        const new_currency: string =
            (targetCurrency as string) || getParamByISO(country, 'currency');

        // Make sure that we the currency is included in our supported set of currencies
        if (
            props?.store?.currencies &&
            !props?.store?.currencies?.includes?.(new_currency)
        )
            return;

        setCurrency(new_currency);

        (async () => {
            const converter = new Converter();

            const current_rates = rates;
            if (!current_rates[new_currency]) {
                current_rates[new_currency] = await converter.getRates(
                    props.currency || props?.store?.currencies?.[0] || 'USD',
                    new_currency
                );
                setRates(current_rates);
            }

            let val = await converter.convert(
                props.price || 0,
                props.currency || props?.store?.currencies?.[0] || 'USD',
                new_currency,
                current_rates[new_currency]
            );

            // Pretty-fy cents
            let cents = (val * 100) % 100;
            if (cents) {
                val = Math.floor(val);

                if (cents > 45) cents = 95;
                else if (cents > 25) cents = 45;
                else cents = 0;

                cents /= 100;
                val += cents;
            }

            setPrice(val);
            setCurrency(new_currency);
        })();
    }, [country, rates, props.price, props.currency, props.store]);

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
