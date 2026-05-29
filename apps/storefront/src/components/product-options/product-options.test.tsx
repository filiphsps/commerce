import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/utils/test/react';
import { useProductOptions } from './context';
import Root from './product-options';

const fakeProduct = () =>
    ({
        handle: 'p1',
        options: [{ name: 'Color', values: ['Red', 'Green'], optionValues: [{ name: 'Red' }, { name: 'Green' }] }],
        variants: {
            edges: [
                {
                    node: {
                        id: 'v1',
                        availableForSale: true,
                        selectedOptions: [{ name: 'Color', value: 'Red' }],
                        price: { amount: '1', currencyCode: 'USD' },
                    },
                },
                {
                    node: {
                        id: 'v2',
                        availableForSale: true,
                        selectedOptions: [{ name: 'Color', value: 'Green' }],
                        price: { amount: '2', currencyCode: 'USD' },
                    },
                },
            ],
        },
    }) as any;

function Probe({ onRender }: { onRender: (v: ReturnType<typeof useProductOptions>) => void }) {
    const v = useProductOptions();
    onRender(v);
    return (
        <button type="button" onClick={() => v.selectVariant({ Color: 'Green' })}>
            pick green
        </button>
    );
}

describe('ProductOptions.Root (uncontrolled)', () => {
    it('seeds selection from initialSelection and updates on selectVariant', () => {
        const captures: any[] = [];
        render(
            <Root product={fakeProduct()} initialSelection={{ Color: 'Red' }}>
                <Probe onRender={(v) => captures.push(v.selection)} />
            </Root>,
        );
        expect(captures[0]).toEqual({ Color: 'Red' });
        fireEvent.click(screen.getByText('pick green'));
        expect(captures.at(-1)).toEqual({ Color: 'Green' });
    });

    it('exposes selectedVariant derived from current selection', () => {
        const captures: any[] = [];
        render(
            <Root product={fakeProduct()} initialSelection={{ Color: 'Red' }}>
                <Probe onRender={(v) => captures.push(v.selectedVariant?.id)} />
            </Root>,
        );
        expect(captures[0]).toBe('v1');
        fireEvent.click(screen.getByText('pick green'));
        expect(captures.at(-1)).toBe('v2');
    });

    it('calls onChange when selection changes', () => {
        const onChange = vi.fn();
        render(
            <Root product={fakeProduct()} initialSelection={{ Color: 'Red' }} onChange={onChange}>
                <Probe onRender={() => {}} />
            </Root>,
        );
        fireEvent.click(screen.getByText('pick green'));
        expect(onChange).toHaveBeenCalledWith({ Color: 'Green' });
    });
});

describe('ProductOptions.Root (controlled)', () => {
    it('uses the selection prop and never holds internal state', () => {
        const onChange = vi.fn();
        const captures: any[] = [];
        const { rerender } = render(
            <Root product={fakeProduct()} selection={{ Color: 'Red' }} onChange={onChange}>
                <Probe onRender={(v) => captures.push(v.selection)} />
            </Root>,
        );
        expect(captures[0]).toEqual({ Color: 'Red' });
        fireEvent.click(screen.getByText('pick green'));
        expect(onChange).toHaveBeenCalledWith({ Color: 'Green' });
        // Critical: internal state must NOT change because controlled mode delegates to parent.
        expect(captures.at(-1)).toEqual({ Color: 'Red' });

        rerender(
            <Root product={fakeProduct()} selection={{ Color: 'Green' }} onChange={onChange}>
                <Probe onRender={(v) => captures.push(v.selection)} />
            </Root>,
        );
        expect(captures.at(-1)).toEqual({ Color: 'Green' });
    });
});

describe('ProductOptions.Root (parent short-circuit)', () => {
    it('forwards children when nested inside another Root, single provider in scope', () => {
        const captures: any[] = [];
        render(
            <Root product={fakeProduct()} initialSelection={{ Color: 'Red' }}>
                <Root product={fakeProduct()} initialSelection={{ Color: 'Green' }}>
                    <Probe onRender={(v) => captures.push(v.selection)} />
                </Root>
            </Root>,
        );
        expect(captures[0]).toEqual({ Color: 'Red' });
    });
});

describe('ProductOptions.Root (renderers prop)', () => {
    it('normalizes renderer keys to lowercase', () => {
        const captures: any[] = [];
        const Custom = () => null;
        render(
            <Root product={fakeProduct()} initialSelection={{ Color: 'Red' }} renderers={{ Color: Custom }}>
                <Probe onRender={(v) => captures.push(Object.keys(v.renderers))} />
            </Root>,
        );
        expect(captures[0]).toContain('color');
    });
});
