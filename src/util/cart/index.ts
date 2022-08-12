import { Config } from '../Config';
import { ProductIdApi } from '../../api/product';
import { ProductModel } from '../../models/ProductModel';

const get_cart = async () => {
    const cart = {
        items: [],
        version: !window.localStorage.getItem('cart') ? Config.version : null,
        ...JSON.parse(window.localStorage.getItem('cart') || '{}')
    };

    // Remove carts from previous versions
    if (cart.version !== Config.version) {
        window.localStorage.removeItem('cart');
        return null;
    }

    const errors = [];
    cart.items = (
        await Promise.all(
            cart.items.map(async (item) => {
                const product: ProductModel = (await ProductIdApi(
                    `${item.id}`
                )) as any;
                const variant = product?.variants?.find(
                    (variant) => variant.id === item.variant_id
                );

                if (!product || !variant) return null;

                if (!variant?.available)
                    errors.push({
                        type: 'out_of_stock',
                        id: item.id,
                        variant_id: item.variant_id
                    });

                return {
                    ...item,
                    total_compare_at_price:
                        variant?.pricing.range !==
                        variant?.pricing.compare_at_range
                            ? variant?.pricing.compare_at_range
                            : null,
                    total_price: variant?.pricing.range || 0,

                    title: product.title,
                    variant_title: variant.title,
                    vendor: product.vendor.handle
                };
            })
        )
    )?.filter((a) => a);

    let price = 0,
        price_with_savings = 0,
        total_items = 0;
    cart.items.forEach((item) => {
        if (!item) return;

        price += parseFloat(item.total_price) * item.quantity;

        price_with_savings += parseFloat(item.total_price) * item.quantity;
        total_items += Number.parseInt(item.quantity, 10);
    });

    cart.price = price;
    cart.price_with_savings = price_with_savings;

    cart.total_items = total_items;
    cart.errors = errors;

    // Sort the cart
    cart.items.sort((a, b) => (a?.id > b?.id ? 1 : b?.id > a?.id ? -1 : 0));
    return cart;
};
const save_cart = async ([, setCart], cart) => {
    let new_cart = {
        version: Config.version,
        items: cart?.items?.map((item) => ({
            id: item?.id,
            variant_id: item?.variant_id,
            quantity: item?.quantity
        }))
    };

    window.localStorage.setItem('cart', JSON.stringify(new_cart));
    setCart(await get_cart());
};

const Get = async () => {
    return await get_cart();
};
const Add = ([, setCart], item) => {
    return new Promise(async (resolve, reject) => {
        let cart = await get_cart();
        let cart_item = cart?.items?.find(
            (cart_item) => cart_item?.variant_id === item?.variant_id
        );

        if (!cart) return reject();

        if ((window as any)?.dataLayer && item.data?.product && item.data?.variant) {
            const product = item.data?.product;
            const variant = item.data?.variant;

            (window as any)?.dataLayer?.push({ ecommerce: null });
            (window as any)?.dataLayer?.push({
                event: "add_to_cart",
                currency: product.pricing.currency,
                value: parseFloat(variant.pricing.range),
                ecommerce: {
                    items: [{
                        item_id: variant.sku || variant.id.split('/').at(-1),
                        item_name: product.title,
                        item_variant: variant.title,
                        item_brand: product.vendor?.title ?? product.brand,
                        currency: product.pricing.currency,
                        quantity: item.quantity,
                        price: parseFloat(variant.pricing.range)
                    }]
                }
            });
        }

        return resolve(
            await Set([cart, setCart], {
                ...item,
                quantity: (cart_item?.quantity || 0) + item.quantity
            })
        );
    });
};
const Remove = ([, setCart], item) => {
    return new Promise(async (resolve, reject) => {
        let cart = await get_cart();

        if (!cart) return reject();

        return resolve(
            await Set([cart, setCart], {
                ...item,
                quantity: 0
            })
        );
    });
};
const Set = ([, setCart], item) => {
    return new Promise(async (resolve, reject) => {
        let cart = await get_cart();

        if (!cart) return reject();

        if (!item.variant_id) return reject();

        cart.items = cart?.items?.filter((cart_item) => {
            if (
                cart_item?.id === item.id &&
                cart_item.variant_id === item.variant_id
            )
                return false;

            return true;
        });

        if (item.quantity >= 1)
            cart.items.push({
                ...item,
                quantity: item.quantity
            });

        await save_cart([cart, setCart], cart);
        return resolve(cart);
    });
};

export default {
    Get,
    Add,
    Remove,
    Set
};
