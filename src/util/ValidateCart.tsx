import LanguageString from '../components/LanguageString';
import React from 'react';

const ValidateQuantity = (variant, quantity) => {
    let value = quantity;
    let alert: any = [];

    if (!variant) return null;

    if (quantity <= 0)
        return {
            alert: [],
            value: 0
        };

    if (value > 1_000_000) {
        alert.push({
            type: 'info',
            content: <LanguageString id={'cart_quantity_limit'} />
        });
        value = 1_000_000;
    }

    if (
        variant?.inventory_policy !== 'allow' &&
        variant?.inventory_quantity &&
        value > variant?.inventory_quantity
    ) {
        alert.push({
            type: 'info',
            content: <LanguageString id={'cart_quantity_exceeds_inventory'} />
        });
        value = variant?.inventory_quantity;
    }

    if (variant && !variant?.available) {
        alert.push({
            type: 'error',
            content: <LanguageString id={'cart_item_out_of_stock'} />
        });
        value = 0;
    }

    return {
        alert,
        value
    };
};

export { ValidateQuantity };
