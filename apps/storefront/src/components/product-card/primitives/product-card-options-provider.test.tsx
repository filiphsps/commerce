// apps/storefront/src/components/product-card/primitives/product-card-options-provider.test.tsx
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ProductCardOptionsProvider,
  usePickerOpen,
  useVariantSelection,
} from './product-card-options-provider';

const product = {
  id: 'gid://shopify/Product/1',
  handle: 'tee',
  variants: { edges: [{ node: { id: 'v1', availableForSale: true, selectedOptions: [{ name: 'Size', value: 'M' }] } }] },
} as never;

describe('ProductCardOptionsProvider', () => {
  it('reads initial seed variant id', () => {
    const { result } = renderHook(() => useVariantSelection(), {
      wrapper: ({ children }) => (
        <ProductCardOptionsProvider product={product} seedVariantId="v1" isSingleBuyable={true}>
          {children}
        </ProductCardOptionsProvider>
      ),
    });
    expect(result.current?.selectedVariantId).toBe('v1');
  });

  it('exposes isSingleBuyable to the picker-open context', () => {
    const { result } = renderHook(() => usePickerOpen(), {
      wrapper: ({ children }) => (
        <ProductCardOptionsProvider product={product} seedVariantId="v1" isSingleBuyable={true}>
          {children}
        </ProductCardOptionsProvider>
      ),
    });
    expect(result.current?.isSingleBuyable).toBe(true);
    expect(result.current?.open).toBe(false);
  });

  it('toggling picker open does not change selection identity', () => {
    let selectionRefBefore: unknown;
    let selectionRefAfter: unknown;
    const Probe = () => {
      const sel = useVariantSelection();
      selectionRefBefore ??= sel;
      selectionRefAfter = sel;
      return null;
    };
    const { result } = renderHook(() => usePickerOpen(), {
      wrapper: ({ children }) => (
        <ProductCardOptionsProvider product={product} seedVariantId="v1" isSingleBuyable={false}>
          <Probe />
          {children}
        </ProductCardOptionsProvider>
      ),
    });
    act(() => result.current?.setOpen(true));
    expect(selectionRefAfter).toBe(selectionRefBefore); // selection context is referentially stable
  });
});
