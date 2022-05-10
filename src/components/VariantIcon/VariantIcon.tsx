import React, { FunctionComponent, memo } from 'react';

interface VariantIconProps {
    id: string;
    icon?: string;
}
const VariantIcon: FunctionComponent<VariantIconProps> = (props) => {
    let product_icon: string = '/assets/icons/product/';
    switch ((props.id || '').toLowerCase().replace(' ', '-')) {
        case 'einmalig':
        case 'dose':
        case 'can':
        case 'regular':
        case 'mini':
        case 'slim':
            product_icon += 'can.svg';
            break;

        case 'stange':
        case 'roll':
            product_icon += 'stock.svg';
            break;

        case '3-stangen':
        case '3-rolls':
            product_icon += '3-stock.svg';
            break;

        case '6-stangen':
        case '6-rolls':
            product_icon += '6-stock.svg';
            break;

        case '12-stangen':
        case '12-rolls':
            product_icon += '12-stock.svg';
            break;

        case '1,2kg':
        case '1.2kg':
        case '24-stangen':
        case '24-rolls':
        case '48-stangen':
        case '48-rolls':
        case 'box':
        case '2-boxes':
            product_icon += 'box.svg';
            break;

        default:
            product_icon += 'dot.svg';
    }

    return (
        <div
            className="VariantIcon"
            style={{
                backgroundImage: `url('${props?.icon || product_icon}')`
            }}
        />
    );
};

export default memo(VariantIcon);
