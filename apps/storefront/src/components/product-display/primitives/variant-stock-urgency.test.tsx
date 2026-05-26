import { describe, expect, it } from 'vitest';
import { render } from '@/utils/test/react';
import VariantStockUrgency from './variant-stock-urgency';

const i18n = {
    product: { 'only-n-left': 'Only {0} left' },
    locale: { code: 'en-US' },
} as any;

describe('VariantStockUrgency (server)', () => {
    it('renders message when seed quantityAvailable <= threshold', () => {
        const { getByText } = render(
            <VariantStockUrgency seedVariant={{ quantityAvailable: 3 } as any} i18n={i18n} threshold={5} />,
        );
        expect(getByText(/Only 3 left/)).toBeTruthy();
    });

    it('renders nothing when seed quantityAvailable > threshold', () => {
        const { container } = render(
            <VariantStockUrgency seedVariant={{ quantityAvailable: 10 } as any} i18n={i18n} threshold={5} />,
        );
        expect(container.textContent?.trim() ?? '').toBe('');
    });

    it('renders nothing when quantityAvailable is undefined', () => {
        const { container } = render(<VariantStockUrgency seedVariant={{} as any} i18n={i18n} threshold={5} />);
        expect(container.textContent?.trim() ?? '').toBe('');
    });
});
