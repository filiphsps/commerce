import { useSession } from 'next-auth/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCartActions, useCartMeta } from '@/components/cart/provider';
import { useSyncBuyerIdentity } from '@/components/cart/use-sync-buyer-identity';
import { renderHook } from '@/utils/test/react';

vi.mock('next-auth/react', () => ({
    useSession: vi.fn(),
}));

vi.mock('@/components/cart/provider', () => ({
    useCartActions: vi.fn(),
    useCartMeta: vi.fn(),
}));

const noopAction = vi.fn().mockResolvedValue({ ok: true, cart: {} });
const updateBuyerIdentity = vi.fn();

const setActions = () => {
    vi.mocked(useCartActions).mockReturnValue({
        addLine: noopAction,
        updateLine: noopAction,
        removeLine: noopAction,
        applyDiscountCode: noopAction,
        removeDiscountCode: noopAction,
        applyGiftCard: noopAction,
        removeGiftCard: noopAction,
        updateNote: noopAction,
        updateAttributes: noopAction,
        updateBuyerIdentity,
    } as any);
};

const setMeta = (email: string | null = null) => {
    vi.mocked(useCartMeta).mockReturnValue({
        discountCodes: [],
        giftCards: [],
        buyerIdentity: email ? ({ email } as any) : null,
        note: null,
        attributes: [],
        checkoutUrl: null,
    });
};

const setSession = (
    status: 'loading' | 'authenticated' | 'unauthenticated',
    user?: { id?: string; email?: string },
) => {
    vi.mocked(useSession).mockReturnValue({
        data: user ? ({ user, expires: '2099-01-01' } as any) : null,
        status,
        update: vi.fn(),
    } as any);
};

describe('useSyncBuyerIdentity', () => {
    beforeEach(() => {
        updateBuyerIdentity.mockClear();
        setActions();
        setMeta(null);
    });

    it('does NOT call updateBuyerIdentity when unauthenticated', () => {
        setSession('unauthenticated');
        renderHook(() => useSyncBuyerIdentity());
        expect(updateBuyerIdentity).not.toHaveBeenCalled();
    });

    it('does NOT call updateBuyerIdentity while session is loading', () => {
        setSession('loading');
        renderHook(() => useSyncBuyerIdentity());
        expect(updateBuyerIdentity).not.toHaveBeenCalled();
    });

    it('calls updateBuyerIdentity exactly once when first authenticated', () => {
        setSession('authenticated', { id: 'user-1', email: 'a@example.com' });
        const { rerender } = renderHook(() => useSyncBuyerIdentity());
        expect(updateBuyerIdentity).toHaveBeenCalledTimes(1);

        rerender();
        expect(updateBuyerIdentity).toHaveBeenCalledTimes(1);
    });

    it('does NOT call again on re-render with same session user', () => {
        setSession('authenticated', { id: 'user-1', email: 'a@example.com' });
        const { rerender } = renderHook(() => useSyncBuyerIdentity());
        expect(updateBuyerIdentity).toHaveBeenCalledTimes(1);

        rerender();
        rerender();
        rerender();
        expect(updateBuyerIdentity).toHaveBeenCalledTimes(1);
    });

    it('calls again when the session user changes', () => {
        setSession('authenticated', { id: 'user-1', email: 'a@example.com' });
        const { rerender } = renderHook(() => useSyncBuyerIdentity());
        expect(updateBuyerIdentity).toHaveBeenCalledTimes(1);

        setSession('authenticated', { id: 'user-2', email: 'b@example.com' });
        rerender();
        expect(updateBuyerIdentity).toHaveBeenCalledTimes(2);
    });

    it('skips the sync call when meta already reflects the session user', () => {
        setMeta('a@example.com');
        setSession('authenticated', { id: 'user-1', email: 'a@example.com' });
        renderHook(() => useSyncBuyerIdentity());
        expect(updateBuyerIdentity).not.toHaveBeenCalled();
    });
});
