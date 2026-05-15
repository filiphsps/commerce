import { describe, expect, it, vi } from 'vitest';
import { ProductOptionsSelector } from '@/components/product-options-selector';
import { fireEvent, render, screen } from '@/utils/test/react';

// Builds a MappedProductOptions[] fixture in the shape getProductOptions
// produces. We hand-roll it (rather than calling getProductOptions on a
// mockProduct) to keep the selector tests pure unit tests.
type MappedValueInput = {
    name: string;
    available?: boolean;
    exists?: boolean;
    selected?: boolean;
    isDifferentProduct?: boolean;
    variantUriQuery?: string;
    variantId?: string;
};
type MappedOptionInput = { name: string; values: MappedValueInput[] };

const buildOptions = (input: MappedOptionInput[]): any[] =>
    input.map((opt, i) => ({
        id: `gid://shopify/ProductOption/${i + 1}`,
        name: opt.name,
        optionValues: opt.values.map((v) => ({
            name: v.name,
            available: v.available ?? true,
            exists: v.exists ?? true,
            selected: v.selected ?? false,
            isDifferentProduct: v.isDifferentProduct ?? false,
            variantUriQuery: v.variantUriQuery ?? `variant=${encodeURIComponent(v.name)}`,
            variant: { id: v.variantId ?? `gid://shopify/ProductVariant/${i}-${v.name}` },
        })),
    }));

describe('components', () => {
    describe('ProductOptionsSelector', () => {
        describe('filtering / rendering', () => {
            it('filters out the Default Title option group', () => {
                const options = buildOptions([{ name: 'Title', values: [{ name: 'Default Title' }] }]);
                const { container } = render(
                    <ProductOptionsSelector options={options} selectedOptions={{}} onChange={() => {}} />,
                );
                expect(container.firstChild).toBeNull();
            });

            it('returns null when every option is filtered out', () => {
                const { container } = render(
                    <ProductOptionsSelector options={[]} selectedOptions={{}} onChange={() => {}} />,
                );
                expect(container.firstChild).toBeNull();
            });

            it('renders one chip per (option, value)', () => {
                const options = buildOptions([{ name: 'Size', values: [{ name: 'S' }, { name: 'M' }, { name: 'L' }] }]);
                render(<ProductOptionsSelector options={options} selectedOptions={{}} onChange={() => {}} />);
                expect(screen.getByRole('button', { name: 'Size: S' })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: 'Size: M' })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: 'Size: L' })).toBeInTheDocument();
            });

            it('respects maxValuesPerOption', () => {
                const options = buildOptions([
                    { name: 'Size', values: [{ name: 'S' }, { name: 'M' }, { name: 'L' }, { name: 'XL' }] },
                ]);
                render(
                    <ProductOptionsSelector
                        options={options}
                        selectedOptions={{}}
                        onChange={() => {}}
                        maxValuesPerOption={3}
                    />,
                );
                expect(screen.getByRole('button', { name: 'Size: S' })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: 'Size: L' })).toBeInTheDocument();
                expect(screen.queryByRole('button', { name: 'Size: XL' })).not.toBeInTheDocument();
            });

            it('uses defaultRenderers.default when no renderer matches the option name', () => {
                const options = buildOptions([{ name: 'Material', values: [{ name: 'Cotton' }] }]);
                render(<ProductOptionsSelector options={options} selectedOptions={{}} onChange={() => {}} />);
                // TextChipRenderer renders a button — verify by tag presence.
                expect(screen.getByRole('button', { name: 'Material: Cotton' })).toBeInTheDocument();
            });
        });

        describe('state derivation', () => {
            it('marks the value selected via selectedOptions, overriding the mapped flag', () => {
                const options = buildOptions([
                    {
                        name: 'Size',
                        values: [{ name: 'S', selected: true /* mapped says S but parent says M */ }, { name: 'M' }],
                    },
                ]);
                render(
                    <ProductOptionsSelector options={options} selectedOptions={{ Size: 'M' }} onChange={() => {}} />,
                );
                expect(screen.getByRole('button', { name: 'Size: M' }).className).toMatch(/selected/);
                expect(screen.getByRole('button', { name: 'Size: S' }).className).not.toMatch(/selected/);
            });

            it('marks values disabled via the mapped available flag', () => {
                const options = buildOptions([
                    {
                        name: 'Size',
                        values: [
                            { name: 'S', available: true },
                            { name: 'M', available: false },
                        ],
                    },
                ]);
                render(<ProductOptionsSelector options={options} selectedOptions={{}} onChange={() => {}} />);
                expect(screen.getByRole('button', { name: 'Size: M' }).className).toMatch(/disabled/);
                expect(screen.getByRole('button', { name: 'Size: S' }).className).not.toMatch(/disabled/);
            });

            it('composes href from productHandle + variantUriQuery when both supplied', () => {
                const options = buildOptions([
                    { name: 'Size', values: [{ name: 'M', variantUriQuery: 'variant=42' }] },
                ]);
                render(
                    <ProductOptionsSelector
                        options={options}
                        selectedOptions={{}}
                        onChange={() => {}}
                        productHandle="demo-product"
                    />,
                );
                const link = screen.getByRole('link', { name: 'Size: M' });
                expect(link.getAttribute('href')).toBe('/products/demo-product/?variant=42');
            });

            it('omits href when productHandle is missing — renders a button', () => {
                const options = buildOptions([{ name: 'Size', values: [{ name: 'M' }] }]);
                render(<ProductOptionsSelector options={options} selectedOptions={{}} onChange={() => {}} />);
                expect(screen.queryByRole('link', { name: 'Size: M' })).not.toBeInTheDocument();
                expect(screen.getByRole('button', { name: 'Size: M' })).toBeInTheDocument();
            });
        });

        describe('emission', () => {
            it('fires onChange with the merged map when a value is clicked', () => {
                const onChange = vi.fn();
                const options = buildOptions([
                    { name: 'Size', values: [{ name: 'S' }, { name: 'M' }] },
                    { name: 'Color', values: [{ name: 'Red' }] },
                ]);
                render(
                    <ProductOptionsSelector
                        options={options}
                        selectedOptions={{ Size: 'S', Color: 'Red' }}
                        onChange={onChange}
                    />,
                );
                fireEvent.click(screen.getByRole('button', { name: 'Size: M' }));
                expect(onChange).toHaveBeenCalledWith({ Size: 'M', Color: 'Red' });
            });

            it('does not fire onChange on a disabled chip', () => {
                const onChange = vi.fn();
                const options = buildOptions([{ name: 'Size', values: [{ name: 'M', available: false }] }]);
                render(
                    <ProductOptionsSelector options={options} selectedOptions={{ Size: 'M' }} onChange={onChange} />,
                );
                fireEvent.click(screen.getByRole('button', { name: 'Size: M' }));
                expect(onChange).not.toHaveBeenCalled();
            });

            it('fires onChange even when clicking the currently selected value', () => {
                const onChange = vi.fn();
                const options = buildOptions([{ name: 'Size', values: [{ name: 'M' }] }]);
                render(
                    <ProductOptionsSelector options={options} selectedOptions={{ Size: 'M' }} onChange={onChange} />,
                );
                fireEvent.click(screen.getByRole('button', { name: 'Size: M' }));
                expect(onChange).toHaveBeenCalledWith({ Size: 'M' });
            });
        });

        describe('retention regression — the bug we are fixing', () => {
            it('preserves Size when changing Color', () => {
                const onChange = vi.fn();
                const options = buildOptions([
                    { name: 'Size', values: [{ name: 'M' }] },
                    { name: 'Color', values: [{ name: 'Red' }, { name: 'Blue' }] },
                ]);
                render(
                    <ProductOptionsSelector
                        options={options}
                        selectedOptions={{ Size: 'M', Color: 'Red' }}
                        onChange={onChange}
                    />,
                );
                fireEvent.click(screen.getByRole('button', { name: 'Color: Blue' }));
                expect(onChange).toHaveBeenCalledWith({ Size: 'M', Color: 'Blue' });
            });

            it('preserves Color when changing Size', () => {
                const onChange = vi.fn();
                const options = buildOptions([
                    { name: 'Size', values: [{ name: 'M' }, { name: 'L' }] },
                    { name: 'Color', values: [{ name: 'Red' }] },
                ]);
                render(
                    <ProductOptionsSelector
                        options={options}
                        selectedOptions={{ Size: 'M', Color: 'Red' }}
                        onChange={onChange}
                    />,
                );
                fireEvent.click(screen.getByRole('button', { name: 'Size: L' }));
                expect(onChange).toHaveBeenCalledWith({ Size: 'L', Color: 'Red' });
            });
        });
    });
});
