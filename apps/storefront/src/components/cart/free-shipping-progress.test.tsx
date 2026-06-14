import { describe, expect, it, vi } from 'vitest';

import { render } from '@/utils/test/react';
import { FreeShippingProgress } from './free-shipping-progress';

vi.mock('@shopify/hydrogen-react', async () => ({
    useShop: vi.fn().mockReturnValue({ domain: 'staging.storefront.localhost' }),
    useShopifyCookies: vi.fn().mockReturnValue({}),
    Money: ({ data }: { data: { amount: string; currencyCode: string } }) => (
        <span data-testid="money">{`${data.currencyCode} ${data.amount}`}</span>
    ),
}));

const i18n = {
    cart: {
        'free-shipping-on-this-order': 'You qualify for FREE shipping on this order.',
        'away-from-free-shipping': 'Add {0} more to your order for free shipping.',
    },
} as never;

describe('FreeShippingProgress', () => {
    it('renders nothing for the none state', () => {
        const { container } = render(<FreeShippingProgress state={{ state: 'none' }} currencyCode="USD" i18n={i18n} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders the unlocked confirmation', () => {
        const { getByTestId } = render(
            <FreeShippingProgress
                state={{ state: 'unlocked', threshold: 75, remaining: 0 }}
                currencyCode="USD"
                i18n={i18n}
            />,
        );
        expect(getByTestId('free-shipping-unlocked').textContent).toContain('FREE shipping');
    });

    it('renders the remaining amount substituted into the progress copy', () => {
        const { getByTestId } = render(
            <FreeShippingProgress
                state={{ state: 'progress', threshold: 75, remaining: 25 }}
                currencyCode="USD"
                i18n={i18n}
            />,
        );
        expect(getByTestId('free-shipping-progress')).toBeTruthy();
        // The remaining amount is substituted into the copy via <Price> (mocked Money).
        expect(getByTestId('money').textContent).toBe('USD 25');
    });
});
