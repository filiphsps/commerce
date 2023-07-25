import { FunctionComponent } from 'react';
import type { StoreModel } from '../../models/StoreModel';
import { Currency as Tender } from 'react-tender';

interface CurrencyProps {
    price?: number;
    suffix?: any;
    prefix?: any;

    currency?: string;
    className?: string;
    store: StoreModel;
}
const Currency: FunctionComponent<CurrencyProps> = ({
    price,
    suffix,
    prefix,
    currency,
    className
}) => {
    return (
        <div className={`Currency ${className || ''}`}>
            {prefix && <span className="Currency-Prefix">{prefix}</span>}
            <Tender value={price || 0} currency={currency || 'USD'} />
            {suffix && <span className="Currency-Suffix">{suffix}</span>}
        </div>
    );
};

export default Currency;
