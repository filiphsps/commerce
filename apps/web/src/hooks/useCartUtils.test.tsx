import type { Locale } from '@/utils/locale';
import { useCart } from '@shopify/hydrogen-react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import type { Mock } from 'vitest';
import { describe, it, vi } from 'vitest';
import { useCartUtils } from './useCartUtils';

vi.mock('next/navigation', () => ({
    useSearchParams: vi.fn()
}));

vi.mock('@shopify/hydrogen-react', () => ({
    useCart: vi.fn()
}));

const USA: Locale = { locale: 'en-US', country: 'US', language: 'EN' };
const GER: Locale = { locale: 'de-DE', country: 'DE', language: 'DE' };

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
