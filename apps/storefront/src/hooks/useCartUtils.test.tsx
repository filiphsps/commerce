import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCartUtils } from '@/hooks/useCartUtils';
import { Locale } from '@/utils/locale';
import { act, renderHook, waitFor } from '@/utils/test/react';
import { useCart } from '@shopify/hydrogen-react';

const USA = Locale.from('en-US')!;
const GER = Locale.from('de-DE')!;

describe('hooks', () => {
    describe('useCartUtils', () => {
        // Mock `next/navigation`.
        vi.mock('next/navigation', async () => ({
            ...(((await vi.importActual('next/navigation')) as any) || {}),
            usePathname: vi.fn().mockReturnValue(''),
            useRouter: () => ({
                replace: vi.fn()
            }),
            useSearchParams: () => ({
                get: () => 'coupon_code',
                getAll: () => ['coupon_code'],
                has: () => true
            })
        }));

        beforeEach(() => {
            (useCart as any).mockReturnValue({
                error: undefined,

                buyerIdentity: {
                    countryCode: 'US'
                },
                buyerIdentityUpdate: vi.fn().mockImplementation(({ countryCode }) => {
                    useCart().buyerIdentity!.countryCode = countryCode;
                }),

                discountCodes: [],
                discountCodesUpdate: vi.fn().mockImplementation((discountCodes) => {
                    useCart().discountCodes = discountCodes;
                }),

                status: 'idle',
                cartReady: true,
                cartCreate: vi.fn().mockImplementation(() => {
                    useCart().status = 'idle';
                })
            });
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should update buyer identity when locale changes', async () => {
            const { rerender } = renderHook((locale: Locale = USA) => useCartUtils({ locale }));
            await waitFor(() => expect(useCart().buyerIdentity?.countryCode).toBe(USA.country));

            await act(() => rerender(GER));
            await waitFor(() => {
                expect(useCart().buyerIdentityUpdate).toHaveBeenCalledWith({ countryCode: GER.country });
            });

            await act(() => rerender(USA));
            await waitFor(() => {
                expect(useCart().buyerIdentityUpdate).toHaveBeenCalledWith({ countryCode: USA.country });
            });

            await waitFor(() => expect(useCart().cartCreate).not.toHaveBeenCalled());
        });

        it('should not create a cart if one already exists', async () => {
            renderHook((locale: Locale = USA) => useCartUtils({ locale }));
            await waitFor(() => expect(useCart().cartCreate).not.toHaveBeenCalled());
        });

        it('should add discount code to cart when present in URL', async () => {
            const discount = ['coupon_code'];

            const { rerender } = renderHook((locale: Locale = USA) => useCartUtils({ locale }));
            await act(() => rerender(USA));

            await waitFor(() => {
                expect(useCart().discountCodesUpdate).toHaveBeenCalledWith(discount);
            });
        });
    });
});
