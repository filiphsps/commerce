import { describe, expect, it, vi } from 'vitest';
import ProductCardActionsClient from '@/components/product-card/primitives/product-card-actions-client';
import { ProductOptionsContext } from '@/components/product-options/context';
import type { ProductOptionsContextValue } from '@/components/product-options/types';
import { render } from '@/utils/test/react';

vi.mock('@shopify/hydrogen-react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@shopify/hydrogen-react')>();
    return {
        ...actual,
        useCart: () => ({ lines: [], linesAdd: vi.fn(), linesUpdate: vi.fn() }),
    };
});

const i18n = {
    common: { 'add-to-cart': 'Add to cart', decrease: 'Decrease', increase: 'Increase' },
} as any;

const product = { id: 'gid://shopify/Product/1', handle: 'p' } as any;

const buildCtx = (): ProductOptionsContextValue =>
    ({
        product,
        resolved: [],
        selection: {},
        selectVariant: () => {},
        selectedVariant: undefined,
        hoveredVariant: undefined,
        setHoveredVariant: () => {},
        renderers: {},
    }) as ProductOptionsContextValue;

const wrap = (props: any) =>
    render(
        <ProductOptionsContext.Provider value={buildCtx()}>
            <ProductCardActionsClient {...props} />
        </ProductOptionsContext.Provider>,
    );

describe('components', () => {
    describe('product-card', () => {
        describe('primitives', () => {
            describe('ProductCardActionsClient', () => {
                it('renders the Add-to-cart button by default', () => {
                    const { getByRole } = wrap({
                        product,
                        mode: 'full',
                        i18n,
                        seedVariantId: 'gid://shopify/ProductVariant/1',
                        initialSeedLineId: null,
                        initialSeedQuantity: 0,
                        addAction: vi.fn().mockResolvedValue({ ok: true }),
                        updateAction: vi.fn(),
                    });
                    expect(getByRole('button', { name: /add to cart/i })).toBeTruthy();
                });

                it('marks the icon-mode submit button with data-mode="icon"', () => {
                    const { container } = wrap({
                        product,
                        mode: 'icon',
                        i18n,
                        seedVariantId: 'gid://shopify/ProductVariant/1',
                        initialSeedLineId: null,
                        initialSeedQuantity: 0,
                        addAction: vi.fn(),
                        updateAction: vi.fn(),
                    });
                    expect(container.querySelector('button[data-mode="icon"]')).toBeTruthy();
                });

                it('renders a quantity stepper when an initial seed line + quantity are provided', () => {
                    const { getByRole, container } = wrap({
                        product,
                        mode: 'full',
                        i18n,
                        seedVariantId: 'gid://shopify/ProductVariant/1',
                        initialSeedLineId: 'line-1',
                        initialSeedQuantity: 2,
                        addAction: vi.fn(),
                        updateAction: vi.fn().mockResolvedValue({ ok: true }),
                    });
                    expect(getByRole('button', { name: /decrease/i })).toBeTruthy();
                    expect(getByRole('button', { name: /increase/i })).toBeTruthy();
                    expect(container.textContent).toContain('2');
                });

                it('disables the Add-to-cart button when no variant can be resolved', () => {
                    const { getByRole } = wrap({
                        product,
                        mode: 'full',
                        i18n,
                        seedVariantId: '',
                        initialSeedLineId: null,
                        initialSeedQuantity: 0,
                        addAction: vi.fn(),
                        updateAction: vi.fn(),
                    });
                    expect((getByRole('button', { name: /add to cart/i }) as HTMLButtonElement).disabled).toBe(true);
                });
            });
        });
    });
});
