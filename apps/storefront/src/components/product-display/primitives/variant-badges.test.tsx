import { describe, expect, it } from 'vitest';
import { render } from '@/utils/test/react';
import VariantBadges from './variant-badges';

const baseI18n = {
    product: {
        vegan: 'vegan',
        'gift-card': 'gift card',
        subscription: 'subscription',
        'free-shipping': 'free shipping',
        'percentage-off': '-{0}%',
    },
} as any;

const product = (overrides: any = {}) =>
    ({
        title: 'P',
        tags: [],
        productType: 'chocolate',
        availableForSale: true,
        variants: {
            edges: [
                {
                    node: {
                        id: 'v1',
                        availableForSale: true,
                        selectedOptions: [],
                        price: { amount: '10', currencyCode: 'USD' },
                    },
                },
            ],
        },
        ...overrides,
    }) as any;

describe('VariantBadges', () => {
    it('renders no badges for a plain product', () => {
        const { container } = render(<VariantBadges product={product()} i18n={baseI18n} />);
        expect(container.textContent?.trim() ?? '').toBe('');
    });

    it('renders Vegan badge when product is tagged vegan and is confectionary', () => {
        const { getByText } = render(<VariantBadges product={product({ tags: ['vegan'] })} i18n={baseI18n} />);
        expect(getByText(/vegan/i)).toBeTruthy();
    });

    it('renders Gift Card badge when isGiftCard', () => {
        const { getByText } = render(<VariantBadges product={product({ isGiftCard: true })} i18n={baseI18n} />);
        expect(getByText(/gift card/i)).toBeTruthy();
    });

    it('renders Subscription badge when requiresSellingPlan', () => {
        const { getByText } = render(
            <VariantBadges product={product({ requiresSellingPlan: true })} i18n={baseI18n} />,
        );
        expect(getByText(/subscription/i)).toBeTruthy();
    });

    it('renders Sale percentage badge when seed variant has compareAtPrice higher than price', () => {
        const p = product({
            variants: {
                edges: [
                    {
                        node: {
                            id: 'v1',
                            availableForSale: true,
                            selectedOptions: [],
                            price: { amount: '80', currencyCode: 'USD' },
                            compareAtPrice: { amount: '100', currencyCode: 'USD' },
                        },
                    },
                ],
            },
        });
        const { getByText } = render(<VariantBadges product={p} i18n={baseI18n} />);
        expect(getByText(/-20%/)).toBeTruthy();
    });

    it('renders Free Shipping banner as an early return overriding other badges', () => {
        const p = product({ tags: ['vegan', 'Free Shipping'] });
        const { getByText, queryByText } = render(<VariantBadges product={p} i18n={baseI18n} />);
        expect(getByText(/free shipping/i)).toBeTruthy();
        expect(queryByText(/^vegan$/i)).toBeNull();
    });
});
