import { useCartActions, useCartStatus } from '@nordcom/cart-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@/utils/test/react';
import ProductCardCta from './product-card-cta';
import { ProductCardOptionsProvider } from './product-card-options-provider';

vi.mock('@nordcom/cart-react', () => ({
    useCartActions: vi.fn(),
    useCartStatus: vi.fn(),
    useMaybeCart: vi.fn().mockReturnValue(null),
}));

const addLine = vi.fn().mockResolvedValue({ ok: true });

beforeEach(() => {
    addLine.mockClear();
    vi.mocked(useCartActions).mockReturnValue({ addLine } as any);
    vi.mocked(useCartStatus).mockReturnValue({ cartReady: true, status: 'idle', error: null });
});

const product = {
    handle: 'tee',
    title: 'Demo Tee',
    variants: {
        nodes: [
            {
                id: 'v1',
                title: 'Default Title',
                availableForSale: true,
                price: { amount: '29.00', currencyCode: 'USD' },
                image: null,
                selectedOptions: [{ name: 'Title', value: 'Default Title' }],
            },
        ],
        edges: [
            {
                node: {
                    id: 'v1',
                    title: 'Default Title',
                    availableForSale: true,
                    price: { amount: '29.00', currencyCode: 'USD' },
                    image: null,
                    selectedOptions: [{ name: 'Title', value: 'Default Title' }],
                },
            },
        ],
    },
} as never;

const i18n = {
    common: { 'add-to-cart': 'Add to bag', 'choose-product-options': 'Choose options', close: 'Close' },
} as never;

describe('ProductCardCta host', () => {
    it('renders the float-pill strategy when placement is float-pill', () => {
        const { container } = render(
            <ProductCardOptionsProvider product={product} seedVariantId="v1" isSingleBuyable={false}>
                <ProductCardCta placement="float-pill" i18n={i18n} />
            </ProductCardOptionsProvider>,
        );
        const btn = container.querySelector('button');
        expect(btn?.getAttribute('aria-label')).toMatch(/choose options/i);
    });

    it('renders the inline-button strategy when placement is inline-button', () => {
        const { container } = render(
            <ProductCardOptionsProvider product={product} seedVariantId="v1" isSingleBuyable={false}>
                <ProductCardCta placement="inline-button" i18n={i18n} />
            </ProductCardOptionsProvider>,
        );
        expect(container.textContent).toMatch(/add to bag/i);
    });

    it('calls addLine with variantId when Add to bag is clicked on a single-buyable product', async () => {
        const { container } = render(
            <ProductCardOptionsProvider product={product} seedVariantId="v1" isSingleBuyable={true}>
                <ProductCardCta placement="inline-button" i18n={i18n} />
            </ProductCardOptionsProvider>,
        );
        const btn = container.querySelector('button');
        expect(btn).toBeTruthy();
        await fireEvent.click(btn!);
        expect(addLine).toHaveBeenCalledWith(expect.objectContaining({ variantId: 'v1', quantity: 1 }));
    });
});
