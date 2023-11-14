import { useCountry } from '@/hooks/useCountry';
import { TooManyRequestsError } from '@/utils/errors';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('hooks', () => {
    describe('useCountry', () => {
        beforeEach(() => {
            vi.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ country: 'SE' })
            } as Response);
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should return the country code', async () => {
            const { result } = renderHook(() => useCountry());

            expect(result.current).toMatchObject({ isLoading: true, error: undefined, code: undefined });

            await waitFor(() =>
                expect(result.current).toMatchObject({ isLoading: false, error: undefined, code: 'SE' })
            );
        });

        it('should handle failed requests', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValue({
                ok: false,
                status: 429,
                statusText: 'Too many requests'
            } as Response);

            const { result } = renderHook(() => useCountry());

            expect(result.current).toMatchObject({ isLoading: true, error: undefined, code: undefined });

            await waitFor(() => {
                expect(result.current).toMatchObject({
                    isLoading: false,
                    error: TooManyRequestsError,
                    code: undefined
                });
            });
        });

        it('should not make a request if the country code is already set', async () => {
            const { result, rerender } = renderHook(() => useCountry());

            await waitFor(() => expect(result.current.code).toBe('SE'));
            await act(() => rerender());

            expect(global.fetch).toBeCalledTimes(1);
        });
    });
});
