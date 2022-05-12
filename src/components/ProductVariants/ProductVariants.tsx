import React, { FunctionComponent, memo } from 'react';

import Currency from '../Currency';
import LanguageString from '../LanguageString';
import VariantIcon from '../VariantIcon';

interface ProductVariantsProps {
    data?: any;
    selected?: number;

    onSelect?: any;
}
const ProductVariants: FunctionComponent<ProductVariantsProps> = (props) => {
    const { data } = props;

    return (
        <div className="ProductVariants">
            {data?.map((variant, index) => {
                return (
                    <div
                        key={variant?.id}
                        className={`ProductVariants-Variant ${
                            props.selected === index &&
                            'ProductVariants-Variant-Selected'
                        }`}
                        onClick={() => props?.onSelect(index || 0)}
                    >
                        <div className="ProductVariants-Variant-Icon">
                            <VariantIcon id={variant?.title} />
                        </div>
                        <div className="ProductVariants-Variant-Title">
                            <LanguageString id={variant?.title} />
                        </div>
                        <div
                            className={`ProductVariants-Variant-Price ${
                                !!variant?.compare_at_price && 'Sale'
                            }`}
                        >
                            {variant?.compare_at_price && (
                                <Currency
                                    className="Sale-Price"
                                    price={variant?.compare_at_price}
                                    currency={variant?.currency}
                                />
                            )}
                            <Currency
                                price={variant?.price}
                                currency={variant?.currency}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default memo(ProductVariants);
