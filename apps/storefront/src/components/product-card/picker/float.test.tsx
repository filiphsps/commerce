import { describe, expect, it, vi } from 'vitest';
import FloatPicker from '@/components/product-card/picker/float';
import { render } from '@/utils/test/react';

const product = {
    handle: 'tee',
    options: [
        {
            name: 'Size',
            values: ['S', 'M', 'L'],
            optionValues: [
                { name: 'S', firstSelectableVariant: { id: 'v1' } },
                { name: 'M', firstSelectableVariant: { id: 'v2' } },
                { name: 'L', firstSelectableVariant: { id: 'v3' } },
            ],
        },
    ],
    variants: {
        edges: [
            {
                node: {
                    id: 'v1',
                    selectedOptions: [{ name: 'Size', value: 'S' }],
                    price: { amount: '38.00', currencyCode: 'USD' },
                    availableForSale: true,
                },
            },
            {
                node: {
                    id: 'v2',
                    selectedOptions: [{ name: 'Size', value: 'M' }],
                    price: { amount: '38.00', currencyCode: 'USD' },
                    availableForSale: true,
                },
            },
            {
                node: {
                    id: 'v3',
                    selectedOptions: [{ name: 'Size', value: 'L' }],
                    price: { amount: '38.00', currencyCode: 'USD' },
                    availableForSale: false,
                },
            },
        ],
    },
} as never;

describe('FloatPicker', () => {
    it('does not render contents when closed', () => {
        const { container } = render(
            <FloatPicker
                product={product}
                locale={{ code: 'en-US' } as never}
                i18n={{} as never}
                open={false}
                onOpenChange={vi.fn()}
            />,
        );
        expect(container.textContent).not.toContain('Size');
    });

    it('renders size chips when open', () => {
        render(
            <FloatPicker
                product={product}
                locale={{ code: 'en-US' } as never}
                i18n={{} as never}
                open={true}
                onOpenChange={vi.fn()}
            />,
        );
        const sizeLabels = document.body.querySelectorAll('*');
        const hasSize = Array.from(sizeLabels).some((el) => el.textContent === 'Size');
        expect(hasSize).toBe(true);
        expect(document.body.querySelectorAll('button').length).toBeGreaterThanOrEqual(3);
    });
});
