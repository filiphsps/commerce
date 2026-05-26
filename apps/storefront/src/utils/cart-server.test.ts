import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./cart-cookie', () => ({
    getCartIdCookie: vi.fn(),
    setCartIdCookie: vi.fn(),
    clearCartIdCookie: vi.fn(),
}));

vi.mock('@nordcom/commerce-db', () => ({
    Shop: { findById: vi.fn() },
}));

vi.mock('@/api/cart', () => ({
    resolveCartProvider: vi.fn(),
}));

vi.mock('next/cache', () => ({
    cacheLife: vi.fn(),
    cacheTag: vi.fn(),
}));

vi.mock('@/utils/locale', async () => {
    const actual = await vi.importActual<typeof import('@/utils/locale')>('@/utils/locale');
    return {
        ...actual,
        Locale: { from: vi.fn() },
    };
});

import { Shop } from '@nordcom/commerce-db';
import { CartNotFoundError } from '@nordcom/commerce-errors';

import { resolveCartProvider } from '@/api/cart';
import { Locale } from '@/utils/locale';

import { clearCartIdCookie, getCartIdCookie, setCartIdCookie } from './cart-cookie';
import { ensureCart, readCart } from './cart-server';

const shop = { id: 'shop-1', commerceProvider: { type: 'shopify' } } as any;
const locale = { code: 'en-US' } as any;

const mkAdapter = (overrides: any = {}) => ({
    type: 'shopify',
    getCart: vi.fn(),
    createCart: vi.fn(),
    ...overrides,
});

beforeEach(() => {
    vi.mocked(getCartIdCookie).mockReset();
    vi.mocked(setCartIdCookie).mockReset();
    vi.mocked(clearCartIdCookie).mockReset();
    vi.mocked(resolveCartProvider).mockReset();
    vi.mocked(Shop.findById as any).mockReset();
    (Locale.from as any).mockReset?.();
    (Locale.from as any).mockImplementation?.(() => locale);
});

describe('readCart', () => {
    it('returns null when no cookie', async () => {
        vi.mocked(getCartIdCookie).mockResolvedValue(null);
        expect(await readCart(shop, locale)).toBeNull();
    });

    it('returns the cart when cookie + adapter succeed', async () => {
        vi.mocked(getCartIdCookie).mockResolvedValue('gid://shopify/Cart/abc');
        vi.mocked(Shop.findById as any).mockResolvedValue(shop);
        const adapter = mkAdapter({ getCart: vi.fn().mockResolvedValue({ id: 'gid://shopify/Cart/abc' }) });
        vi.mocked(resolveCartProvider).mockReturnValue(adapter);
        const cart = await readCart(shop, locale);
        expect(cart).not.toBeNull();
        expect(cart!.id).toBe('gid://shopify/Cart/abc');
    });

    it('clears cookie + returns null when adapter throws CartNotFoundError', async () => {
        vi.mocked(getCartIdCookie).mockResolvedValue('gid://shopify/Cart/abc');
        vi.mocked(Shop.findById as any).mockResolvedValue(shop);
        const adapter = mkAdapter({
            getCart: vi.fn().mockRejectedValue(new CartNotFoundError('gid://shopify/Cart/abc')),
        });
        vi.mocked(resolveCartProvider).mockReturnValue(adapter);
        expect(await readCart(shop, locale)).toBeNull();
        expect(clearCartIdCookie).toHaveBeenCalled();
    });
});

describe('ensureCart', () => {
    it('returns the existing cart when readCart succeeds', async () => {
        vi.mocked(getCartIdCookie).mockResolvedValue('gid://shopify/Cart/abc');
        vi.mocked(Shop.findById as any).mockResolvedValue(shop);
        const cart = { id: 'gid://shopify/Cart/abc' };
        const adapter = mkAdapter({ getCart: vi.fn().mockResolvedValue(cart) });
        vi.mocked(resolveCartProvider).mockReturnValue(adapter);
        expect(await ensureCart(shop, locale)).toEqual(cart);
        expect(adapter.createCart).not.toHaveBeenCalled();
    });

    it('creates a new cart + sets cookie when no existing cart', async () => {
        vi.mocked(getCartIdCookie).mockResolvedValue(null);
        const cart = { id: 'gid://shopify/Cart/new' };
        const adapter = mkAdapter({ createCart: vi.fn().mockResolvedValue(cart) });
        vi.mocked(resolveCartProvider).mockReturnValue(adapter);
        expect(await ensureCart(shop, locale)).toEqual(cart);
        expect(setCartIdCookie).toHaveBeenCalledWith('gid://shopify/Cart/new');
    });
});
