import { FiMinus, FiPlus } from 'react-icons/fi';
import React, { FunctionComponent, memo, useEffect, useState } from 'react';

import Button from '../Button';
import Cart from '../../util/cart';
import Currency from '../Currency';
import Image from 'next/image';
import Input from '../Input';
import LanguageString from '../LanguageString';
import Link from '../Link';
import { ProductApi } from '../../api';
import ProductBadges from '../ProductBadges';
import { ProductModel } from '../../models/ProductModel';
import useSWR from 'swr';
import { useStore } from 'react-context-hook';

interface ProductCardProps {
    handle?: string;
    data?: ProductModel;

    search?: boolean;
}
const ProductCard: FunctionComponent<ProductCardProps> = (props) => {
    const [showAll, setShowAll] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [selectedVariant, setSelectedVariant] = useState(0);
    const [loading, setLoading] = useState(false);
    const language = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE;
    const [cart, setCart] = useStore<any>('cart');

    const {
        data,
        error
    }: {
        data?: any;
        error?: any;
    } = useSWR(
        props?.handle ? [`${props.handle}`] : null,
        (url) => ProductApi(url),
        {
            fallbackData: props?.data
        }
    );

    useEffect(() => {
        setSelectedVariant(data?.variants?.length - 1);
    }, [props.data]);

    if (!data) return <div className="ProductCard" />;

    const show_variants = data?.variants?.length > 0;
    const variant = data?.variants?.[selectedVariant] || null;

    return (
        <div className={`ProductCard ${(props?.search && 'Search') || ''}`}>
            <div className="ProductCard-Container">
                <Link
                    className="ProductCard-Container-Image"
                    to={data && `/products/${data?.handle}`}
                    as={'/products/[handle]'}
                >
                    {data?.images?.length > 0 && (
                        <Image
                            src={
                                data?.images?.[variant?.image]?.src ||
                                data?.images?.[selectedVariant]?.src ||
                                data?.images?.[0]?.src ||
                                ''
                            }
                            alt={
                                data?.images?.[variant?.image]?.alt ||
                                data?.images?.[selectedVariant]?.alt ||
                                data?.images?.[0]?.alt ||
                                ''
                            }
                            width={150}
                            height={150}
                            loading="lazy"
                            layout="fixed"
                            placeholder="empty"
                        />
                    )}
                </Link>

                <div className="ProductCard-Container-Content">
                    <div className="ProductCard-Container-Header">
                        <Link
                            className="ProductCard-Container-Header-Vendor"
                            to={data && `/collections/${data?.vendor?.handle}`}
                        >
                            {data?.vendor?.title &&
                                (data?.vendor?.title?.[language] ||
                                    data?.vendor?.title?.['en_US'] ||
                                    data?.vendor?.title)}
                        </Link>
                        <Link
                            className="ProductCard-Container-Header-Title"
                            to={data && `/products/${data?.handle}`}
                            as={'/products/[handle]'}
                        >
                            {data?.title &&
                                (data?.title?.[language] ||
                                    data?.title?.['en_US'] ||
                                    data?.title)}
                        </Link>
                    </div>

                    <ProductBadges data={data} />

                    <div
                        className={`ProductCard-TotalPrice ${
                            !!variant?.compare_at_price &&
                            variant?.compare_at_price !== variant?.price &&
                            'Sale'
                        }`}
                    >
                        {(variant?.compare_at_price ||
                            variant?.compare_at_from_price) && (
                            <div className="Sale-Price">
                                <Currency
                                    price={
                                        variant?.compare_at_price ||
                                        variant?.compare_at_from_price
                                    }
                                    currency={variant?.currency}
                                />
                            </div>
                        )}
                        <Currency
                            price={variant?.from_price || variant?.price}
                            currency={variant?.currency}
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
                                    {data?.variants?.map((variant, index) => {
                                        if (!showAll && index >= 3) return null;

                                        return (
                                            <div
                                                key={index}
                                                className={`ProductCard-Actions-Action-Variant ${
                                                    index === selectedVariant &&
                                                    'ProductCard-Actions-Action-Variant-Selected'
                                                }`}
                                                onClick={() =>
                                                    setSelectedVariant(index)
                                                }
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
                                    })}

                                    {data?.variants?.length > 3 && (
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

                                    setQuantity(0);
                                }}
                            >
                                -
                            </div>
                            <Input
                                type="number"
                                value={quantity}
                                onChange={(event) => {
                                    setQuantity(event?.target?.value);
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
                            disabled={
                                !variant?.available ||
                                !parseInt(quantity as any) ||
                                loading
                            }
                            onClick={() => {
                                if (loading) return;

                                setLoading(true);

                                Cart.Add([cart, setCart], {
                                    id: data?.id,
                                    variant_id:
                                        data?.variants[selectedVariant]?.id,
                                    quantity: quantity,
                                    price: parseInt(
                                        data?.variants[selectedVariant]?.price
                                    )
                                })
                                    .then(() => {
                                        setLoading(false);
                                    })
                                    .catch((err) => {
                                        console.error(err);
                                        setLoading(false);
                                    });
                            }}
                        >
                            {(loading && (
                                <LanguageString id={'adding_to_cart'} />
                            )) ||
                                (!variant?.available && (
                                    <LanguageString id={'out_of_stock'} />
                                )) || <LanguageString id={'add_to_cart'} />}
                        </Button>
                    </div>
                </div>
            </div>

            <div className={`ProductCard-Price`}>
                {data?.variants?.length > 1 && <LanguageString id={'from'} />}
                <Currency
                    price={data?.variants?.[0].price}
                    currency={variant?.currency}
                />
            </div>
        </div>
    );
};

export default memo(ProductCard);
