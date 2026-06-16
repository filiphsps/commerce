import { describe, expect, it, vi } from 'vitest';
import { ProductQuantityBreaksItem } from '@/components/products/product-quantity-breaks';
import { render } from '@/utils/test/react';

const variant = { price: { amount: '10.00', currencyCode: 'USD' }, availableForSale: true };

vi.mock('@/components/product-options/context', () => ({
    useProductOptions: () => ({ selectedVariant: variant }),
}));

const quantity = vi.fn();
vi.mock('@/components/products/quantity-provider', () => ({
    useQuantity: () => ({ quantity: quantity(), setQuantity: vi.fn() }),
}));

vi.mock('@nordcom/cart-react', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    useCartStatus: () => ({ cartReady: true, status: 'idle' }),
}));

describe('components/products/product-quantity-breaks', () => {
    it('marks the active tier with aria-pressed for assistive tech', () => {
        quantity.mockReturnValue(3);
        const { container } = render(<ProductQuantityBreaksItem i18n={{} as never} minQuantity={3} />);
        expect(container.querySelector('button')?.getAttribute('aria-pressed')).toBe('true');
    });

    it('leaves an inactive tier unpressed', () => {
        quantity.mockReturnValue(1);
        const { container } = render(<ProductQuantityBreaksItem i18n={{} as never} minQuantity={5} />);
        expect(container.querySelector('button')?.getAttribute('aria-pressed')).toBe('false');
    });
});
