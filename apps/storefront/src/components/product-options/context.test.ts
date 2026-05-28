import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode, useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { useMaybeProductOptions, useProductOptions } from './context';
import Root from './product-options';

const fakeProduct = {
    handle: 'p1',
    options: [{ name: 'Color', values: ['Red', 'Green'], optionValues: [{ name: 'Red' }, { name: 'Green' }] }],
    variants: {
        edges: [
            {
                node: {
                    id: 'v1',
                    availableForSale: true,
                    selectedOptions: [{ name: 'Color', value: 'Red' }],
                    price: { amount: '1', currencyCode: 'USD' },
                },
            },
            {
                node: {
                    id: 'v2',
                    availableForSale: true,
                    selectedOptions: [{ name: 'Color', value: 'Green' }],
                    price: { amount: '2', currencyCode: 'USD' },
                },
            },
        ],
    },
} as never;

/**
 * `renderHook` wrapper that mounts the hook under a real `ProductOptions.Root`
 * seeded with `{ Color: 'Red' }`, so the context exposes the genuine
 * `InnerRoot` value (memoized resolution + the `useCallback`-stabilized
 * `selectVariant`) rather than a hand-rolled stand-in.
 *
 * @param props.children - The hook-host element provided by `renderHook`.
 * @returns The `Root` element wrapping `children`.
 */
const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(Root, { product: fakeProduct, initialSelection: { Color: 'Red' } }, children);

describe('product-options context', () => {
    it('throws when useProductOptions is read outside a Root', () => {
        expect(() => renderHook(() => useProductOptions())).toThrow(/ProductOptions\.Root/);
    });

    it('returns null from useMaybeProductOptions outside a Root', () => {
        const { result } = renderHook(() => useMaybeProductOptions());
        expect(result.current).toBeNull();
    });

    it('exposes the resolved selection and variant inside a Root', () => {
        const { result } = renderHook(() => useProductOptions(), { wrapper });
        expect(result.current.selection).toEqual({ Color: 'Red' });
        expect(result.current.selectedVariant?.id).toBe('v1');
    });

    it('keeps selectVariant referentially stable across re-render and selection changes', () => {
        const { result, rerender } = renderHook(() => useProductOptions(), { wrapper });
        const initial = result.current.selectVariant;

        rerender();
        expect(result.current.selectVariant).toBe(initial);

        act(() => result.current.selectVariant({ Color: 'Green' }));
        expect(result.current.selection).toEqual({ Color: 'Green' });
        // The stable identity is the whole point: a consumer effect keyed on
        // `selectVariant` must not see a new function after the selection moves,
        // which is what would otherwise drive the FINDING-B2 infinite loop.
        expect(result.current.selectVariant).toBe(initial);
    });

    it('does not re-fire a consumer effect keyed on selectVariant when the selection changes', () => {
        const seen: unknown[] = [];
        const useConsumer = () => {
            const ctx = useProductOptions();
            useEffect(() => {
                seen.push(ctx.selectVariant);
            }, [ctx.selectVariant]);
            return ctx;
        };

        const { result } = renderHook(useConsumer, { wrapper });
        expect(seen).toHaveLength(1);

        act(() => result.current.selectVariant({ Color: 'Green' }));
        // The context value object changes (new `selection`/`resolved`), so the
        // consumer re-renders — but `selectVariant` is unchanged, so the effect
        // must stay quiet: no spurious churn, no loop.
        expect(seen).toHaveLength(1);
    });
});
