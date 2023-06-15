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
const Currency: FunctionComponent<CurrencyProps> = ({ price, suffix, prefix, currency, className}) => {
    return (
        <div className={`Currency ${className || ''}`}>
            {prefix && <span className="Currency-Prefix">{prefix}</span>}
            <Tender value={price || 0} currency={currency} />
            {suffix && <span className="Currency-Suffix">{suffix}</span>}
        </div>
    );
};

export default Currency;
