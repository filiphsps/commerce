import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSearchParams } from 'next/navigation';

import { useCartUtils } from '@/hooks/useCartUtils';
import { Locale } from '@/utils/locale';
import { act, renderHook, waitFor } from '@/utils/test/react';
import { useCart } from '@shopify/hydrogen-react';

import type { Mock } from 'vitest';

vi.mock('next/navigation', () => ({
    useSearchParams: vi.fn()
}));

vi.mock('@shopify/hydrogen-react', () => ({
    useCart: vi.fn(),
    useShopifyCookies: vi.fn().mockReturnValue({})
}));

const USA = Locale.from('en-US')!;
const GER = Locale.from('de-DE')!;

describe('hooks', () => {
    describe('useCartUtils', () => {
        beforeEach(() => {
            (useSearchParams as Mock<any, any>).mockReturnValue({});

            (useCart as Mock<any, any>).mockReturnValue({
                error: undefined,

                buyerIdentity: {
                    countryCode: 'US'
                },
                buyerIdentityUpdate: vi.fn().mockImplementation(({ countryCode }) => {
                    useCart().buyerIdentity = {
                        countryCode
                    };
                }),

                discountCodes: [],
                discountCodesUpdate: vi.fn().mockImplementation((discountCodes) => {
                    useCart().discountCodes = discountCodes;
                }),

                status: 'idle',
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
                expect(useCart().buyerIdentity?.countryCode).toBe(GER.country);
                expect(useCart().buyerIdentityUpdate).toHaveBeenCalledWith({ countryCode: GER.country });
            });

            await act(() => rerender(USA));
            await waitFor(() => {
                expect(useCart().buyerIdentity?.countryCode).toBe(USA.country);
                expect(useCart().buyerIdentityUpdate).toHaveBeenCalledWith({ countryCode: USA.country });
            });

            await waitFor(() => expect(useCart().cartCreate).not.toHaveBeenCalled());
        });

        it('should not create a cart if one already exists', async () => {
            renderHook((locale: Locale = USA) => useCartUtils({ locale }));
            await waitFor(() => expect(useCart().cartCreate).not.toHaveBeenCalled());
        });

        it('should add discount code to cart when present in URL', async () => {
            const discount = ['COUPON_CODE'];
            (useSearchParams as Mock<any, any>).mockReturnValue({
                discount: discount
            });

            const { rerender } = renderHook((locale: Locale = USA) => useCartUtils({ locale }));
            await act(() => rerender());

            await waitFor(() => expect(useCart().discountCodes).toEqual(discount));
        });
    });
});
