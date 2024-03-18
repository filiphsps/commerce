import { usePrevious } from '@/hooks/usePrevious';
import { renderHook } from '@/utils/test/react';
import { describe, expect, it } from 'vitest';

describe('hooks', () => {
    describe('usePrevious', () => {
        it('should return undefined on initial render', () => {
            const { result } = renderHook(() => usePrevious('test'));

            expect(result.current).toBeUndefined();
        });

        it('should return the previous value after a re-render', () => {
            const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
                initialProps: { value: 'initial' }
            });

            expect(result.current).toBeUndefined();

            rerender({ value: 'updated' });
            expect(result.current).toBe('initial');

            rerender({ value: 'updated again' });
            expect(result.current).toBe('updated');
        });

        it('should return the previous value after a re-render with the same value', () => {
            const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
                initialProps: { value: 'initial' }
            });

            expect(result.current).toBeUndefined();

            rerender({ value: 'initial' });
            expect(result.current).toBe('initial');

            rerender({ value: 'initial' });
            expect(result.current).toBe('initial');
        });

        it('should return the previous value after a re-render with a different value', () => {
            const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
                initialProps: { value: 'initial' }
            });

            expect(result.current).toBeUndefined();

            rerender({ value: 'updated' });
            expect(result.current).toBe('initial');

            rerender({ value: 'updated again' });
            expect(result.current).toBe('updated');

            rerender({ value: 'updated' });
            expect(result.current).toBe('updated again');
        });
    });
});
