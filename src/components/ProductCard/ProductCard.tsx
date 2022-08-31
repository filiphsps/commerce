import { FiMinus, FiPlus } from 'react-icons/fi';
import React, { FunctionComponent, memo, useEffect, useState } from 'react';

import Button from '../Button';
import Currency from '../Currency';
import Image from 'next/image';
import Input from '../Input';
import LanguageString from '../LanguageString';
import Link from '../Link';
import { ProductModel } from '../../models/ProductModel';
import { useCart } from 'react-use-cart';

interface ProductCardProps {
    handle?: string;
    data?: ProductModel;
}
const ProductCard: FunctionComponent<ProductCardProps> = (props) => {
    const { data: product } = props;

    const cart = useCart();
    const [showAll, setShowAll] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [selectedVariant, setSelectedVariant] = useState(
        product?.variants?.length - 1
    );

    useEffect(() => {
        setSelectedVariant(product?.variants?.length - 1);
    }, [product]);

    const show_variants = product?.variants?.length > 0;
    const variant = product?.variants?.[selectedVariant] || null;

    return (
        <div className={`ProductCard`}>
            <div className="ProductCard-Container">
                <Link
                    className="ProductCard-Container-Image"
                    to={product && `/products/${product?.handle}`}
                    as={'/products/[handle]'}
                >
                    {product?.images?.length > 0 && (
                        <Image
                            src={product?.images?.[variant?.default_image]}
                            alt={product?.images?.[variant?.default_image]?.alt}
                            width={150}
                            height={150}
                            layout="fixed"
                            placeholder="empty"
                            priority
                        />
                    )}
                </Link>

                <div className="ProductCard-Container-Content">
                    <div className="ProductCard-Container-Header">
                        <Link
                            className="ProductCard-Container-Header-Vendor"
                            to={
                                product &&
                                `/collections/${product?.vendor?.handle}`
                            }
                        >
                            {product?.vendor?.title}
                        </Link>
                        <Link
                            className="ProductCard-Container-Header-Title"
                            to={product && `/products/${product?.handle}`}
                            as={'/products/[handle]'}
                        >
                            {product?.title}
                        </Link>
                    </div>

                    <div
                        className={`ProductCard-TotalPrice ${
                            variant?.pricing.compare_at_range ? 'Sale' : ''
                        }`}
                    >
                        {variant?.pricing?.compare_at_range && (
                            <div className="Sale-Price">
                                <Currency
                                    price={
                                        variant?.pricing?.compare_at_range ||
                                        variant?.pricing?.compare_at_range
                                    }
                                    currency={variant?.pricing?.currency}
                                />
                            </div>
                        )}
                        <Currency
                            price={variant?.pricing?.range}
                            currency={variant?.pricing?.currency}
                        />
                    </div>

                    <div className="ProductCard-Actions">
                        {show_variants && (
                            <div className="ProductCard-Actions-Action ProductCard-Actions-Action-Variants">
                                <div
                                    className={`ProductCard-Actions-Action-Variants ${
                                        (showAll && 'Open') || ''
                                    }`}
                                >
                                    {product?.variants?.map(
                                        (variant, index) => {
                                            if (!showAll && index >= 3)
                                                return null;

                                            return (
                                                <div
                                                    key={index}
                                                    className={`ProductCard-Actions-Action-Variant ${
                                                        index ===
                                                            selectedVariant &&
                                                        'ProductCard-Actions-Action-Variant-Selected'
                                                    }`}
                                                    onClick={() =>
                                                        setSelectedVariant(
                                                            index
                                                        )
                                                    }
                                                    data-nosnippet
                                                >
                                                    <LanguageString
                                                        id={
                                                            variant?.title?.split(
                                                                ' /'
                                                            )[0]
                                                        }
                                                    />
                                                </div>
                                            );
                                        }
                                    )}

                                    {product?.variants?.length > 3 && (
                                        <div
                                            className="ProductCard-Actions-Action-Variant"
                                            onClick={() => setShowAll(!showAll)}
                                        >
                                            {showAll ? (
                                                <FiMinus
                                                    className="Icon"
                                                    style={{ marginBottom: 10 }}
                                                />
                                            ) : (
                                                <FiPlus
                                                    className="Icon"
                                                    style={{
                                                        marginBottom: 10
                                                    }}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="ProductCard-Actions-Action ProductCard-Actions-Action-QuantityInput">
                            <div
                                className="Action"
                                onClick={() => {
                                    if (quantity - 1 >= 0)
                                        return setQuantity(
                                            parseInt(quantity as any) - 1
                                        );

                                    return setQuantity(0);
                                }}
                            >
                                -
                            </div>
                            <Input
                                className="Input"
                                type="number"
                                value={quantity}
                                onChange={(event) => {
                                    setQuantity(
                                        Number.parseInt(
                                            event?.target?.value,
                                            10
                                        )
                                    );
                                }}
                            />
                            <div
                                className="Action"
                                onClick={() =>
                                    setQuantity(parseInt(quantity as any) + 1)
                                }
                            >
                                +
                            </div>
                        </div>

                        <Button
                            className="Button"
                            disabled={
                                !variant?.available ||
                                !parseInt(quantity as any)
                            }
                            onClick={() => {
                                cart.addItem({
                                    id: `${product?.id}#${product?.variants[selectedVariant]?.id}`,
                                    price: product?.variants[selectedVariant]
                                        ?.pricing.range,
                                    quantity: quantity,

                                    title: product?.title,
                                    variant_title:
                                        product?.variants[selectedVariant].title
                                });

                                setTimeout(() => {}, 3000);
                            }}
                        >
                            <span data-nosnippet>
                                {!variant?.available
                                    ? 'Out of stock'
                                    : 'Add to Cart'}
                            </span>
                        </Button>
                    </div>
                </div>
            </div>

            <div className={`ProductCard-Price`}>
                {product?.variants?.length > 1 && (
                    <LanguageString id={'from'} />
                )}
                <Currency
                    price={product?.variants?.[0].pricing.range}
                    currency={variant?.pricing.currency}
                />
            </div>
        </div>
    );
};

export default memo(ProductCard);
