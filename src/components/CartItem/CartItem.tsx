import React, { FunctionComponent, useEffect, useState } from 'react';

import Currency from '../Currency';
import { FiTrash } from 'react-icons/fi';
import Image from 'next/image';
import Input from '../Input';
import Link from '../Link';
import Loader from '../Loader';
import { ProductIdApi } from '../../api/product';
import { ProductModel } from '../../models/ProductModel';
import { ProductVariantModel } from '../../models/ProductVariantModel';
import { useCart } from 'react-use-cart';
import { useRouter } from 'next/router';
import useSWR from 'swr';

interface CartItemProps {
    total_items?: number;
    data?: any;
}
const CartItem: FunctionComponent<CartItemProps> = (props) => {
    // TODO: remove replace once we've cleared all broken carts
    const product_id = props.data.id
        .split('#')[0]
        .replace('gid://shopify/Product/', '');
    const variant_id = props.data.id
        .split('#')[1]
        .replace('gid://shopify/ProductVariant/', '');

    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const cart = useCart();
    const { data } = useSWR([product_id], (id) =>
        ProductIdApi({ id: id, locale: router.locale })
    ) as any;
    const product: ProductModel = data;
    const [variant, setVariant] = useState<ProductVariantModel>(null);

    useEffect(() => {
        if (!product) return;

        setVariant(
            product?.variants?.find((variant) => variant?.id === variant_id)
        );
    }, [product]);

    const changeAmount = (event: any) => {
        if (event?.target?.value == props?.data?.quantity) return;
        cart.updateItemQuantity(
            `${product?.id}#${variant?.id}`,
            parseInt(event?.target?.value) || 0
        );
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

    let discount = variant?.pricing?.compare_at_range
        ? variant?.pricing?.compare_at_range - variant?.pricing?.range
        : 0;
    return (
        <div className="CartItem">
            <div className="CartItem-ProductImage">
                <Image
                    src={product?.images?.[variant?.default_image]?.src}
                    layout="fill"
                    objectFit="contain"
                />
            </div>
            <div className="CartItem-Content">
                <div className="CartItem-Content-Subtitle">
                    {product?.vendor?.title}
                </div>
                <Link
                    to={`/products/${product?.handle}`}
                    as={'/products/[handle]'}
                    className="CartItem-Content-Title"
                >
                    {product?.title}
                </Link>
                <div className="CartItem-Content-Meta">
                    <div className="CartItem-Content-Badge">
                        {variant?.title}
                    </div>
                </div>
            </div>
            <div className="CartItem-Quantity">
                <Input
                    className="Input"
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
                                variant?.pricing?.compare_at_range *
                                props?.data?.quantity
                            }
                            currency={variant?.pricing?.currency}
                            className="Currency-Sale"
                        />
                    </span>
                )}
                <Currency
                    price={variant?.pricing?.range * props?.data?.quantity}
                    currency={variant?.pricing?.currency}
                    className={discount > 0 && 'Currency-Discount'}
                />
            </div>
            <div
                className="CartItem-Remove"
                onClick={() => {
                    cart.removeItem(`${product?.id}#${variant?.id}`);
                }}
            >
                <FiTrash className="Icon" />
            </div>
        </div>
    );
};

export default CartItem;
