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
                onAdd={vi.fn()}
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
                onAdd={vi.fn()}
            />,
        );
        const sizeLabels = document.body.querySelectorAll('*');
        const hasSize = Array.from(sizeLabels).some((el) => el.textContent === 'Size');
        expect(hasSize).toBe(true);
        expect(document.body.querySelectorAll('button').length).toBeGreaterThanOrEqual(3);
    });

    it('calls onAdd with selected variant id when Add to bag is clicked', () => {
        const onAdd = vi.fn();
        const singleVariantProduct = {
            handle: 'tee',
            options: [
                { name: 'Size', values: ['M'], optionValues: [{ name: 'M', firstSelectableVariant: { id: 'v2' } }] },
            ],
            variants: {
                edges: [
                    {
                        node: {
                            id: 'v2',
                            selectedOptions: [{ name: 'Size', value: 'M' }],
                            price: { amount: '38.00', currencyCode: 'USD' },
                            availableForSale: true,
                        },
                    },
                ],
            },
        } as never;
        render(
            <FloatPicker
                product={singleVariantProduct}
                locale={{ code: 'en-US' } as never}
                i18n={{} as never}
                open={true}
                onOpenChange={vi.fn()}
                onAdd={onAdd}
            />,
        );
        const btn = Array.from(document.body.querySelectorAll('button')).find((b) =>
            b.textContent?.match(/add to bag/i),
        );
        btn?.click();
        expect(onAdd).toHaveBeenCalledWith('v2');
    });
});
