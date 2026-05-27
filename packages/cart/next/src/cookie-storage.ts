import { cookies } from 'next/headers';

import type { CartIdStorage } from './storage';

const MAX_COOKIE_VALUE_LENGTH = 512;
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
const DEFAULT_COOKIE_NAME = 'nordcom-cart';

export interface HttpOnlyCookieStorageOpts {
    name?: string;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    maxAge?: number;
    domain?: string;
    path?: string;
}

/**
 * Builds a {@link CartIdStorage} backed by a single HttpOnly cookie on the
 * Next.js request/response. Server-only by construction — `cookies()` is the
 * App Router primitive and is unavailable in client components.
 *
 * The default settings target a Shopify-style "sticky cart" UX: 180-day
 * `maxAge`, `sameSite=lax`, `secure` in production, `path=/`. Reads reject
 * empty strings and values longer than {@link MAX_COOKIE_VALUE_LENGTH} so that
 * forged or corrupted cookies never reach the adapter.
 *
 * @param opts.name - Cookie name. Defaults to `nordcom-cart`.
 * @param opts.secure - Marks the cookie `Secure`. Defaults to
 *   `NODE_ENV === 'production'`.
 * @param opts.sameSite - SameSite attribute. Defaults to `lax`.
 * @param opts.maxAge - Cookie lifetime in seconds. Defaults to 180 days.
 * @param opts.domain - Optional domain attribute; omitted when unset so the
 *   browser scopes the cookie to the request host.
 * @param opts.path - Cookie path. Defaults to `/`.
 * @returns A {@link CartIdStorage} implementation suitable for cart-next's
 *   reader, ensurer, and typed-action factories.
 */
export function httpOnlyCookieStorage(opts: HttpOnlyCookieStorageOpts = {}): CartIdStorage {
    const name = opts.name ?? DEFAULT_COOKIE_NAME;
    const secure = opts.secure ?? process.env.NODE_ENV === 'production';
    const sameSite = opts.sameSite ?? 'lax';
    const maxAge = opts.maxAge ?? DEFAULT_MAX_AGE_SECONDS;
    const path = opts.path ?? '/';
    const { domain } = opts;

    return {
        async get() {
            const jar = await cookies();
            const value = jar.get(name)?.value;
            if (!value || value.length === 0 || value.length > MAX_COOKIE_VALUE_LENGTH) {
                return null;
            }
            return value;
        },
        async set(id) {
            const jar = await cookies();
            jar.set(name, id, {
                httpOnly: true,
                sameSite,
                secure,
                path,
                maxAge,
                ...(domain ? { domain } : {}),
            });
        },
        async clear() {
            const jar = await cookies();
            jar.delete(name);
        },
    };
}
