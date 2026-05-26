import 'server-only';

import { readCart } from '@/utils/cart-server';
import { getRequestContext } from '@/utils/request-context';

import CartHydratorClient from './cart-hydrator-client';

const CartHydrator = async () => {
    const ctx = await getRequestContext();
    if (!ctx) return null;
    const cart = await readCart(ctx.shop, ctx.locale);
    return <CartHydratorClient initialCart={cart} shopId={ctx.shop.id} />;
};

CartHydrator.displayName = 'Nordcom.Cart.Hydrator';
export default CartHydrator;
