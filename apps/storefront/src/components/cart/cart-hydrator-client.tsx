'use client';

import { useEffect } from 'react';
import type { Cart } from '@/api/cart/types';

import { useNordcomCartInternal } from './provider';

export type CartHydratorClientProps = {
    initialCart: Cart | null;
    shopId: string;
};

const CartHydratorClient = ({ initialCart, shopId }: CartHydratorClientProps) => {
    const { setInitialCart, setShopId } = useNordcomCartInternal();
    // Set shop id first so the broadcast effect sees it when the seed-cart re-render fires.
    useEffect(() => {
        setShopId(shopId);
    }, [shopId, setShopId]);
    useEffect(() => {
        setInitialCart(initialCart);
    }, [initialCart, setInitialCart]);
    return null;
};

CartHydratorClient.displayName = 'Nordcom.Cart.HydratorClient';
export default CartHydratorClient;
