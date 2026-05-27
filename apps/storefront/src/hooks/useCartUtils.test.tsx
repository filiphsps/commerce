import { useCartActions, useCartMeta, useCartStatus } from '@nordcom/cart-react';
import * as nav from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartUtils } from '@/hooks/useCartUtils';
import { Locale } from '@/utils/locale';
import { act, renderHook, waitFor } from '@/utils/test/react';

const USA = Locale.from('en-US')!;

// Hoisted so the mock closure and individual tests share the same spy reference.
const replace = vi.fn();

// Mock `next/navigation`.
vi.mock('next/navigation', async () => ({
    ...(((await vi.importActual('next/navigation')) as any) || {}),
    usePathname: vi.fn().mockReturnValue(''),
    useRouter: () => ({
        replace,
        push: vi.fn(),
    }),
    useSearchParams: vi.fn(() => ({
        get: () => 'coupon_code',
        getAll: () => ['coupon_code'],
        has: () => true,
        toString: () => 'discount=coupon_code',
        size: 1,
    })),
}));

vi.mock('@nordcom/cart-react', async (importOriginal) => {
    const actual = (await importOriginal()) as Record<string, unknown>;
    return {
        ...actual,
        useCartActions: vi.fn(),
        useCartMeta: vi.fn(),
        useCartStatus: vi.fn(),
        useMaybeCart: vi.fn().mockReturnValue(null),
    };
});

const noopAction = vi.fn().mockResolvedValue({ ok: true, cart: {} });
const buildActions = (overrides: Partial<{ applyDiscountCode: ReturnType<typeof vi.fn> }> = {}) =>
    ({
        addLine: noopAction,
        updateLine: noopAction,
        removeLine: noopAction,
        applyDiscountCode: overrides.applyDiscountCode ?? noopAction,
        removeDiscountCode: noopAction,
        applyGiftCard: noopAction,
        removeGiftCard: noopAction,
        updateNote: noopAction,
        updateAttributes: noopAction,
    }) as any;

describe('hooks', () => {
    describe('useCartUtils', () => {
        beforeEach(() => {
            vi.mocked(useCartActions).mockReturnValue(buildActions());
            vi.mocked(useCartMeta).mockReturnValue({
                discountCodes: [],
                giftCards: [],
                buyerIdentity: null,
                note: null,
                attributes: [],
                checkoutUrl: null,
            });
            vi.mocked(useCartStatus).mockReturnValue({ status: 'idle', cartReady: true, error: null });
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('applies a discount code present in the URL', async () => {
            const applyDiscountCode = vi.fn().mockResolvedValue({ ok: true, cart: {} });
            vi.mocked(useCartActions).mockReturnValue(buildActions({ applyDiscountCode }));

            const { rerender } = renderHook((locale: Locale = USA) => useCartUtils({ locale }));
            await act(() => rerender(USA));

            await waitFor(() => {
                expect(applyDiscountCode).toHaveBeenCalledWith('coupon_code');
            });
        });

        describe('discount URL cleanup', () => {
            beforeEach(() => {
                replace.mockClear();
                vi.mocked(nav.useSearchParams).mockReturnValue(new URLSearchParams('discount=new10') as any);
            });

            it('does not replace URL before Shopify confirms the discount code', async () => {
                vi.mocked(useCartActions).mockReturnValue(buildActions());
                vi.mocked(useCartMeta).mockReturnValue({
                    discountCodes: [],
                    giftCards: [],
                    buyerIdentity: null,
                    note: null,
                    attributes: [],
                    checkoutUrl: null,
                });
                vi.mocked(useCartStatus).mockReturnValue({ status: 'idle', cartReady: true, error: null });

                renderHook(() => useCartUtils({ locale: USA }));

                await act(async () => {});
                expect(replace).not.toHaveBeenCalled();
            });

            it('replaces URL once cart status is idle and code is applied', async () => {
                vi.mocked(useCartActions).mockReturnValue(buildActions());
                vi.mocked(useCartMeta).mockReturnValue({
                    discountCodes: [{ code: 'NEW10', applicable: true }],
                    giftCards: [],
                    buyerIdentity: null,
                    note: null,
                    attributes: [],
                    checkoutUrl: null,
                });
                vi.mocked(useCartStatus).mockReturnValue({ status: 'idle', cartReady: true, error: null });

                renderHook(() => useCartUtils({ locale: USA }));

                await waitFor(() =>
                    expect(replace).toHaveBeenCalledWith(
                        expect.stringMatching(/^(?!.*discount)/),
                        expect.objectContaining({ scroll: false }),
                    ),
                );
            });

            it('only fires applyDiscountCode once when Shopify rejects the code (discountCodes stays empty)', async () => {
                const applyDiscountCode = vi
                    .fn()
                    .mockResolvedValue({ ok: false, reason: 'invalid-code', message: 'nope' });
                vi.mocked(useCartActions).mockReturnValue(buildActions({ applyDiscountCode }));
                vi.mocked(useCartMeta).mockReturnValue({
                    discountCodes: [],
                    giftCards: [],
                    buyerIdentity: null,
                    note: null,
                    attributes: [],
                    checkoutUrl: null,
                });
                vi.mocked(useCartStatus).mockReturnValue({ status: 'idle', cartReady: true, error: null });

                const { rerender } = renderHook(() => useCartUtils({ locale: USA }));

                await act(async () => {});

                // Simulate additional renders (e.g. unrelated state changes) that
                // keep status === 'idle' and discountCodes === [].
                await act(() => rerender());
                await act(() => rerender());

                await waitFor(() => expect(applyDiscountCode).toHaveBeenCalledTimes(1));
            });
        });
    });
});
