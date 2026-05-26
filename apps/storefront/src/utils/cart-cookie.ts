import 'server-only';

import { cookies } from 'next/headers';

const COOKIE_NAME = 'nordcom-cart';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export async function getCartIdCookie(): Promise<string | null> {
    const c = await cookies();
    const value = c.get(COOKIE_NAME)?.value;
    if (!value || value.length === 0 || value.length > 512) return null;
    return value;
}

export async function setCartIdCookie(cartId: string): Promise<void> {
    const c = await cookies();
    c.set(COOKIE_NAME, cartId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: MAX_AGE_SECONDS,
    });
}

export async function clearCartIdCookie(): Promise<void> {
    const c = await cookies();
    c.delete(COOKIE_NAME);
}
