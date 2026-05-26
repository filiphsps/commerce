import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductOptionsContext } from '../context';
import type { ProductOptionsContextValue, ResolvedOption, ResolvedOptionValue } from '../types';
import Value from './value';

function wrap(value: ResolvedOptionValue, group: ResolvedOption, renderers = {}) {
    const ctx = {
        product: {} as any,
        resolved: [group],
        selection: {},
        selectVariant: () => {},
        selectedVariant: undefined,
        hoveredVariant: undefined,
        setHoveredVariant: () => {},
        renderers,
    } satisfies ProductOptionsContextValue;
    return render(
        <ProductOptionsContext.Provider value={ctx}>
            <Value group={group} value={value} />
        </ProductOptionsContext.Provider>,
    );
}

const colorGrp: ResolvedOption = { name: 'Color', values: [] };
const sizeGrp: ResolvedOption = { name: 'Size', values: [] };
const flavorGrp: ResolvedOption = { name: 'Flavor', values: [] };

describe('Value renderer selection', () => {
    it('uses ColorSwatch when value.swatch.color is present', () => {
        const { container } = wrap(
            { name: 'Red', selected: false, available: true, swatch: { color: '#f00' } },
            colorGrp,
        );
        expect(container.querySelector('.product-options-swatch')).toBeTruthy();
    });

    it('uses ImageSwatch when value.swatch.image is present and no color', () => {
        const { container } = wrap(
            { name: 'Floral', selected: false, available: true, swatch: { image: { url: 'https://cdn/x.png' } } },
            { name: 'Pattern', values: [] },
        );
        expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn/x.png');
    });

    it('uses SizeChip when option name matches /size/i', () => {
        const { container } = wrap({ name: 'M', selected: false, available: true }, sizeGrp);
        expect(container.querySelector('.product-options-chip')).toBeTruthy();
    });

    it('uses SizeChip when value name matches a size pattern', () => {
        const { container } = wrap({ name: 'XL', selected: false, available: true }, { name: 'Variant', values: [] });
        expect(container.querySelector('.product-options-chip')).toBeTruthy();
    });

    it('falls back to TextChip for arbitrary values', () => {
        const { container } = wrap({ name: 'Vanilla', selected: false, available: true }, flavorGrp);
        expect(container.querySelector('.product-options-chip')).toBeTruthy();
    });

    it('honors per-call renderer override (case-insensitive)', () => {
        const Custom = () => <span data-testid="custom">flavor!</span>;
        const { getByTestId } = wrap({ name: 'Vanilla', selected: false, available: true }, flavorGrp, {
            flavor: Custom,
        });
        expect(getByTestId('custom')).toBeTruthy();
    });
});
