import { describe, expect, it } from 'vitest';
import ProductCardPrice from '@/components/product-card/primitives/product-card-price';
import { Locale } from '@/utils/locale';
import { render } from '@/utils/test/react';

const locale = Locale.default;

describe('components/product-card/primitives/product-card-price', () => {
    it('shows only the current price when not on sale', () => {
        const variant = { price: { amount: '20', currencyCode: 'USD' } } as never;
        const { container } = render(<ProductCardPrice seedVariant={variant} locale={locale} />);
        expect(container.querySelector('del')).toBeNull();
        expect(container.textContent).toContain('$20');
    });

    it('marks the compare-at price as superseded with <del> when on sale', () => {
        const variant = {
            price: { amount: '20', currencyCode: 'USD' },
            compareAtPrice: { amount: '30', currencyCode: 'USD' },
        } as never;
        const { container } = render(<ProductCardPrice seedVariant={variant} locale={locale} />);
        const del = container.querySelector('del');
        expect(del).not.toBeNull();
        expect(del?.textContent).toContain('$30');
    });
});
