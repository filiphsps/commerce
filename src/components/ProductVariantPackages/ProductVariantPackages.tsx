import React, { FunctionComponent, memo } from 'react';

import Currency from '../Currency';
import LanguageString from '../LanguageString';
import VariantIcon from '../VariantIcon';

interface ProductVariantPackagesProps {
    data?: any;
    selected?: number;

    onSelect?: any;
}
const ProductVariantPackages: FunctionComponent<ProductVariantPackagesProps> = (
    props
) => {
    const { data } = props;

    if (data?.length <= 0) return null;

    return (
        <div className="ProductVariantPackages">
            {data?.map((variant, index) => {
                if (index > 0) return null;

                return (
                    <div
                        key={variant?.id || index}
                        className={`ProductVariantPackages-Variant ${
                            props.selected === index &&
                            'ProductVariantPackages-Variant-Selected'
                        }`}
                        onClick={() => props?.onSelect(index || 0)}
                    >
                        <VariantIcon id={variant?.title} />
                        <div className="ProductVariantPackages-Variant-Content">
                            <div className="ProductVariantPackages-Variant-Content-Title">
                                <LanguageString id={variant?.title} />
                            </div>
                            <div className="ProductVariantPackages-Variant-Content-Meta">
                                <Currency
                                    price={variant?.price}
                                    currency={variant?.currency}
                                />
                                <div>
                                    {variant?.quantity}{' '}
                                    <LanguageString
                                        id={
                                            (variant?.quantity > 1 && 'cans') ||
                                            'can'
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default memo(ProductVariantPackages);
