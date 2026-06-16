import { describe, expect, it, vi } from 'vitest';
import { AcceptedPaymentMethods } from '@/components/informational/accepted-payment-methods';
import { Locale } from '@/utils/locale';
import { render } from '@/utils/test/react';

vi.mock('react-payment-brand-icons', () => ({
    PaymentIcon: ({ name }: { name: string }) => <span data-icon={name} />,
}));

vi.mock('@/api/shopify', () => ({
    ShopifyApiClient: vi.fn().mockResolvedValue({}),
}));

const settings = vi.fn();
vi.mock('@/api/store', () => ({
    ShopPaymentSettingsApi: () => settings(),
}));

describe('components/informational/accepted-payment-methods', () => {
    it('renders nothing when no payment methods are configured', async () => {
        settings.mockResolvedValueOnce({ acceptedCardBrands: [], supportedDigitalWallets: [] });
        const { container } = render(await AcceptedPaymentMethods({ shop: {} as any, locale: Locale.default }));
        expect(container.firstChild).toBeNull();
    });

    it('renders a labeled list of the configured brands', async () => {
        settings.mockResolvedValueOnce({
            acceptedCardBrands: ['VISA', 'MASTERCARD'],
            supportedDigitalWallets: ['APPLE_PAY'],
        });
        const { container } = render(
            await AcceptedPaymentMethods({
                shop: {} as any,
                locale: Locale.default,
                label: 'Accepted payment methods',
            }),
        );

        const list = container.querySelector('ul')!;
        expect(list.getAttribute('aria-label')).toBe('Accepted payment methods');
        // One list item per accepted card brand + digital wallet.
        expect(list.querySelectorAll('li')).toHaveLength(3);
    });
});
