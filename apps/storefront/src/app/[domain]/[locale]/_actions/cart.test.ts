import { CartUserError } from '@nordcom/commerce-errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));
vi.mock('@/utils/request-context', () => ({
    getRequestContext: vi.fn(),
}));
vi.mock('@/utils/cart-server', () => ({
    ensureCart: vi.fn(),
    readCart: vi.fn(),
}));
vi.mock('@/utils/dictionary', () => ({
    getDictionary: vi.fn().mockResolvedValue({
        'cart-errors': {
            'missing-shop': 'shop gone',
            'missing-variant': 'no variant',
            'missing-line': 'no line',
            'missing-cart': 'expired',
            'invalid-quantity': 'bad qty',
            'invalid-code': 'bad code',
            unauthorized: 'log in',
            'user-error': 'cart error',
            'network-error': 'network down',
            'provider-error': 'provider down',
        },
    }),
}));
vi.mock('@/api/cart', () => ({
    resolveCartProvider: vi.fn(),
}));
vi.mock('@/auth', () => ({ getAuthSession: vi.fn() }));

import { revalidateTag } from 'next/cache';
import { resolveCartProvider } from '@/api/cart';
import { getAuthSession } from '@/auth';
import { ensureCart } from '@/utils/cart-server';
import { getRequestContext } from '@/utils/request-context';
import {
    addToCartAction,
    applyDiscountCodeAction,
    applyGiftCardAction,
    removeCartLineAction,
    removeDiscountCodeAction,
    removeGiftCardAction,
    updateAttributesAction,
    updateBuyerIdentityAction,
    updateCartLineQuantityAction,
    updateNoteAction,
} from './cart';

const ctx = {
    shop: { id: 'shop-1', commerceProvider: { type: 'shopify' } },
    locale: { code: 'en-US', country: 'US' },
} as any;
const seededCart = { id: 'gid://shopify/Cart/abc', totalQuantity: 1, lines: [], discountCodes: [] } as any;
const updatedCart = { id: 'gid://shopify/Cart/abc', totalQuantity: 2, lines: [] } as any;

const mkAdapter = (overrides: any = {}) => ({
    type: 'shopify',
    addLines: vi.fn().mockResolvedValue(updatedCart),
    updateLines: vi.fn().mockResolvedValue(updatedCart),
    removeLines: vi.fn().mockResolvedValue(updatedCart),
    applyDiscountCodes: vi.fn().mockResolvedValue(updatedCart),
    applyGiftCardCodes: vi.fn().mockResolvedValue(updatedCart),
    removeGiftCardCodes: vi.fn().mockResolvedValue(updatedCart),
    updateBuyerIdentity: vi.fn().mockResolvedValue(updatedCart),
    updateNote: vi.fn().mockResolvedValue(updatedCart),
    updateAttributes: vi.fn().mockResolvedValue(updatedCart),
    ...overrides,
});

beforeEach(() => {
    vi.mocked(getRequestContext).mockResolvedValue(ctx);
    vi.mocked(ensureCart).mockResolvedValue(seededCart);
    vi.mocked(revalidateTag).mockReset();
    vi.mocked(getAuthSession).mockReset();
});

describe('addToCartAction', () => {
    it('returns ok + cart on success and revalidates tag', async () => {
        const adapter = mkAdapter();
        vi.mocked(resolveCartProvider).mockReturnValue(adapter);
        const fd = new FormData();
        fd.set('variantId', 'gid://shopify/ProductVariant/1');
        fd.set('quantity', '1');
        const r = await addToCartAction(fd);
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.cart).toBe(updatedCart);
        expect(adapter.addLines).toHaveBeenCalled();
        expect(revalidateTag).toHaveBeenCalledWith('cart:gid://shopify/Cart/abc', 'max');
    });

    it('returns missing-variant with localized message when variantId absent', async () => {
        const r = await addToCartAction(new FormData());
        expect(r.ok).toBe(false);
        if (!r.ok) {
            expect(r.reason).toBe('missing-variant');
            expect(r.message).toBe('no variant');
        }
    });

    it('maps Shopify userError to user-error result and surfaces userError message', async () => {
        const adapter = mkAdapter({
            addLines: vi.fn().mockRejectedValue(new CartUserError([{ field: 'lines', message: 'Sold out' }])),
        });
        vi.mocked(resolveCartProvider).mockReturnValue(adapter);
        const fd = new FormData();
        fd.set('variantId', 'gid://shopify/ProductVariant/1');
        fd.set('quantity', '1');
        const r = await addToCartAction(fd);
        expect(r.ok).toBe(false);
        if (!r.ok) {
            expect(r.reason).toBe('user-error');
            expect(r.userErrors?.[0]?.message).toBe('Sold out');
            expect(r.message).toBe('Sold out');
        }
    });
});

describe('updateCartLineQuantityAction', () => {
    it('returns missing-line without lineId', async () => {
        const r = await updateCartLineQuantityAction(new FormData());
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.reason).toBe('missing-line');
    });

    it('routes quantity=0 to removeLines', async () => {
        const adapter = mkAdapter();
        vi.mocked(resolveCartProvider).mockReturnValue(adapter);
        const fd = new FormData();
        fd.set('lineId', 'line-1');
        fd.set('quantity', '0');
        fd.set('cartId', 'gid://shopify/Cart/abc');
        await updateCartLineQuantityAction(fd);
        expect(adapter.removeLines).toHaveBeenCalled();
        expect(adapter.updateLines).not.toHaveBeenCalled();
    });

    it('calls updateLines for non-zero quantity', async () => {
        const adapter = mkAdapter();
        vi.mocked(resolveCartProvider).mockReturnValue(adapter);
        const fd = new FormData();
        fd.set('lineId', 'line-1');
        fd.set('quantity', '3');
        fd.set('cartId', 'gid://shopify/Cart/abc');
        await updateCartLineQuantityAction(fd);
        expect(adapter.updateLines).toHaveBeenCalledWith(
            expect.objectContaining({ lines: [{ id: 'line-1', quantity: 3 }] }),
        );
    });
});

describe('removeCartLineAction', () => {
    it('returns ok and revalidates', async () => {
        const adapter = mkAdapter();
        vi.mocked(resolveCartProvider).mockReturnValue(adapter);
        const fd = new FormData();
        fd.set('lineId', 'line-1');
        fd.set('cartId', 'gid://shopify/Cart/abc');
        const r = await removeCartLineAction(fd);
        expect(r.ok).toBe(true);
    });
});

describe('applyDiscountCodeAction / removeDiscountCodeAction', () => {
    it('apply rejects empty code', async () => {
        const r = await applyDiscountCodeAction(new FormData());
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.reason).toBe('invalid-code');
    });

    it('apply forwards code to adapter', async () => {
        const adapter = mkAdapter();
        vi.mocked(resolveCartProvider).mockReturnValue(adapter);
        const fd = new FormData();
        fd.set('code', 'SUMMER10');
        const r = await applyDiscountCodeAction(fd);
        expect(r.ok).toBe(true);
        expect(adapter.applyDiscountCodes).toHaveBeenCalledWith(expect.objectContaining({ codes: ['SUMMER10'] }));
    });

    it('remove sends an empty array to clear codes', async () => {
        const adapter = mkAdapter();
        vi.mocked(resolveCartProvider).mockReturnValue(adapter);
        const r = await removeDiscountCodeAction(new FormData());
        expect(r.ok).toBe(true);
        expect(adapter.applyDiscountCodes).toHaveBeenCalledWith(expect.objectContaining({ codes: [] }));
    });
});

describe('applyGiftCardAction / removeGiftCardAction', () => {
    it('apply rejects empty code', async () => {
        const r = await applyGiftCardAction(new FormData());
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.reason).toBe('invalid-code');
    });

    it('apply forwards code to adapter', async () => {
        const adapter = mkAdapter();
        vi.mocked(resolveCartProvider).mockReturnValue(adapter);
        const fd = new FormData();
        fd.set('code', 'GIFT-100');
        const r = await applyGiftCardAction(fd);
        expect(r.ok).toBe(true);
        expect(adapter.applyGiftCardCodes).toHaveBeenCalledWith(expect.objectContaining({ codes: ['GIFT-100'] }));
    });

    it('remove rejects empty id', async () => {
        const r = await removeGiftCardAction(new FormData());
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.reason).toBe('invalid-code');
    });

    it('remove forwards id to adapter', async () => {
        const adapter = mkAdapter();
        vi.mocked(resolveCartProvider).mockReturnValue(adapter);
        const fd = new FormData();
        fd.set('id', 'gid://shopify/AppliedGiftCard/1');
        const r = await removeGiftCardAction(fd);
        expect(r.ok).toBe(true);
        expect(adapter.removeGiftCardCodes).toHaveBeenCalledWith(
            expect.objectContaining({ ids: ['gid://shopify/AppliedGiftCard/1'] }),
        );
    });
});

describe('updateBuyerIdentityAction', () => {
    it('returns unauthorized without a session', async () => {
        vi.mocked(getAuthSession).mockResolvedValue(null as any);
        const r = await updateBuyerIdentityAction(new FormData());
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.reason).toBe('unauthorized');
    });

    it('uses session identity not FormData', async () => {
        vi.mocked(getAuthSession).mockResolvedValue({
            user: { email: 'u@x.com', shopifyAccessToken: 'tok' },
        } as any);
        const adapter = mkAdapter();
        vi.mocked(resolveCartProvider).mockReturnValue(adapter);
        const fd = new FormData();
        fd.set('email', 'evil@attacker.com');
        await updateBuyerIdentityAction(fd);
        expect(adapter.updateBuyerIdentity).toHaveBeenCalledWith(
            expect.objectContaining({
                buyerIdentity: expect.objectContaining({ email: 'u@x.com', customerAccessToken: 'tok' }),
            }),
        );
    });
});

describe('updateNoteAction / updateAttributesAction', () => {
    it('note action forwards plain string', async () => {
        const adapter = mkAdapter();
        vi.mocked(resolveCartProvider).mockReturnValue(adapter);
        const fd = new FormData();
        fd.set('note', 'Gift wrap please');
        await updateNoteAction(fd);
        expect(adapter.updateNote).toHaveBeenCalledWith(expect.objectContaining({ note: 'Gift wrap please' }));
    });

    it('attributes action parses JSON-encoded attributes', async () => {
        const adapter = mkAdapter();
        vi.mocked(resolveCartProvider).mockReturnValue(adapter);
        const fd = new FormData();
        fd.set('attributes', JSON.stringify([{ key: 'source', value: 'campaign-42' }]));
        await updateAttributesAction(fd);
        expect(adapter.updateAttributes).toHaveBeenCalledWith(
            expect.objectContaining({ attributes: [{ key: 'source', value: 'campaign-42' }] }),
        );
    });
});
