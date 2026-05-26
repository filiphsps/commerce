import { describe, expect, it } from 'vitest';
import { render } from '@/utils/test/react';
import VariantPrice from './variant-price';

const variant = (overrides: any = {}) => ({
    id: 'v',
    price: { amount: '62.30', currencyCode: 'EUR' },
    compareAtPrice: { amount: '89.00', currencyCode: 'EUR' },
    ...overrides,
});

describe('VariantPrice (server)', () => {
    it('renders the seed price + compareAt + sale percent', () => {
        const { container } = render(<VariantPrice seedVariant={variant()} locale="en-US" />);
        expect(container.textContent).toMatch(/€62\.30/);
        expect(container.textContent).toMatch(/€89\.00/);
        expect(container.textContent).toMatch(/30%/);
    });

    it('omits compareAt and pct when not on sale', () => {
        const { container } = render(
            <VariantPrice seedVariant={variant({ compareAtPrice: undefined })} locale="en-US" />,
        );
        expect(container.textContent).toMatch(/€62\.30/);
        expect(container.textContent).not.toMatch(/%/);
    });
});
