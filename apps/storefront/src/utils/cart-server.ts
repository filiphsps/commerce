import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';
import { CartNotFoundError } from '@nordcom/commerce-errors';
import { cacheLife, cacheTag } from 'next/cache';

import { resolveCartProvider } from '@/api/cart';
import type { Cart } from '@/api/cart/types';
import type { Locale as LocaleType } from '@/utils/locale';
import { Locale } from '@/utils/locale';

import { clearCartIdCookie, getCartIdCookie, setCartIdCookie } from './cart-cookie';

async function cachedFetchCart(cartId: string, shopId: string, localeCode: string): Promise<Cart | null> {
    'use cache';
    cacheTag(`cart:${cartId}`);
    cacheLife('hours');
    const shop = (await Shop.findById(shopId)) as OnlineShop | null;
    if (!shop) return null;
    const locale = Locale.from(localeCode);
    if (!locale) return null;
    return resolveCartProvider(shop).getCart({ cartId, shop, locale });
}

export async function readCart(shop: OnlineShop, locale: LocaleType): Promise<Cart | null> {
    const cartId = await getCartIdCookie();
    if (!cartId) return null;
    try {
        const cart = await cachedFetchCart(cartId, shop.id, locale.code);
        if (cart === null) {
            await clearCartIdCookie();
        }
        return cart;
    } catch (error) {
        if (error instanceof CartNotFoundError || (error as Error)?.name === 'CartNotFoundError') {
            await clearCartIdCookie();
            return null;
        }
        throw error;
    }
}

export async function ensureCart(shop: OnlineShop, locale: LocaleType): Promise<Cart> {
    const existing = await readCart(shop, locale);
    if (existing) return existing;
    const adapter = resolveCartProvider(shop);
    const cart = await adapter.createCart({ shop, locale });
    await setCartIdCookie(cart.id);
    return cart;
}
