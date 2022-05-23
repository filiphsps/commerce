import React, { FunctionComponent, useEffect, useState } from 'react';

import Cart from '../../util/cart';
import Currency from '../Currency';
import { FiTrash } from 'react-icons/fi';
import Image from 'next/image';
import Input from '../Input';
import LanguageString from '../LanguageString';
import Link from '../Link';
import Loader from '../Loader';
import { ProductIdApi } from '../../api/product';
import useSWR from 'swr';
import { useStore } from 'react-context-hook';

interface CartItemProps {
    total_items?: number;
    data?: any;
}
const CartItem: FunctionComponent<CartItemProps> = (props) => {
    const language = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE;
    const [isLoading, setIsLoading] = useState(false);
    const { data: product } = useSWR([props?.data?.id], (url) =>
        ProductIdApi(url)
    ) as any;
    const [variant, setVariant] = useState(null);
    const [cart, setCart] = useStore<any>('cart');

    useEffect(() => {
        if (!product) return;

        setVariant(
            product?.variants?.find(
                (variant) => variant?.id === props?.data?.variant_id
            )
        );
    }, [product]);

    const changeAmount = (event: any) => {
        if (event?.target?.value == props?.data?.quantity) return;

        setIsLoading(true);

        Cart.Set([cart, setCart], {
            id: product?.id,
            variant_id: variant?.id,
            price: variant?.price,
            quantity: parseInt(event?.target?.value) || 0
        })
            .catch((err) => {
                console.error(err);
                setIsLoading(false);
            })
            .then(() => setIsLoading(false));
    };

    if (!product || !variant || isLoading) {
        return (
            <div
                className="CartItem"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <Loader />
            </div>
        );
    }

    let discount = variant?.compare_at_price - variant?.price;
    return (
        <div className="CartItem">
            <div className="CartItem-ProductImage">
                <img src={product?.images?.[variant?.image]?.src} />
            </div>
            <div className="CartItem-Content">
                <div className="CartItem-Content-Subtitle">
                    {product?.vendor?.title &&
                        (product?.vendor?.title[language] ||
                            product?.vendor?.title['en_US'] ||
                            product?.vendor?.title)}
                </div>
                <Link
                    to={`/products/${product?.handle}`}
                    as={'/products/[handle]'}
                    className="CartItem-Content-Title"
                >
                    {product?.title &&
                        (product?.title[language] ||
                            product?.title['en_US'] ||
                            product?.title)}
                </Link>
                <div className="CartItem-Content-Meta">
                    <div className="CartItem-Content-Badge">
                        <LanguageString
                            id={
                                (
                                    variant?.title &&
                                    (variant?.title[language] ||
                                        variant?.title['en_US'] ||
                                        variant?.title)
                                )?.split(' /')[0]
                            }
                        />
                    </div>
                </div>
            </div>
            <div className="CartItem-Quantity">
                <Input
                    defaultValue={props?.data?.quantity}
                    onBlur={(event) => changeAmount(event)}
                    onKeyPress={(event) => {
                        if (event.key !== 'Enter') return;

                        changeAmount(event);
                    }}
                />
            </div>
            <div className="CartItem-Price">
                {discount > 0 && (
                    <span>
                        <Currency
                            price={
                                variant?.compare_at_price *
                                props?.data?.quantity
                            }
                            currency={variant?.currency}
                            className="Currency-Sale"
                        />
                    </span>
                )}
                <Currency
                    price={variant?.price * props?.data?.quantity}
                    currency={variant?.currency}
                    className={discount > 0 && 'Currency-Discount'}
                />
            </div>
            <div
                className="CartItem-Remove"
                onClick={() => {
                    setIsLoading(true);
                    Cart.Remove([cart, setCart], {
                        id: product?.id,
                        variant_id: variant?.id,
                        quantity: props.data?.quantity
                    })
                        .catch((err) => {
                            console.error(err);
                        })
                        .then(() => setIsLoading(false));
                }}
            >
                <FiTrash className="Icon" />
            </div>
        </div>
    );
};

export default CartItem;
