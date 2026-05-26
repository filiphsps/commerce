import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductOptionsContext } from '../context';
import type { ProductOptionsContextValue, ResolvedOption } from '../types';
import Group from './group';

const grp = (values: string[]): ResolvedOption => ({
    name: 'Color',
    values: values.map((v) => ({ name: v, selected: false, available: true })),
});

function wrap(group: ResolvedOption) {
    const ctx: ProductOptionsContextValue = {
        product: {} as any,
        resolved: [group],
        selection: {},
        selectVariant: () => {},
        selectedVariant: undefined,
        hoveredVariant: undefined,
        setHoveredVariant: () => {},
        renderers: {},
    };
    return render(
        <ProductOptionsContext.Provider value={ctx}>
            <Group name={group.name} />
        </ProductOptionsContext.Provider>,
    );
}

describe('Group', () => {
    it('renders one button per value', () => {
        const { container } = wrap(grp(['Red', 'Green', 'Blue']));
        expect(container.querySelectorAll('button').length).toBe(3);
    });

    it('does not write a data-overflow attribute (More is the sole source of truth)', () => {
        const { container } = wrap(grp(['A', 'B', 'C', 'D', 'E', 'F']));
        const row = container.querySelector('.product-card-swatch-row') as HTMLElement;
        expect(row.getAttribute('data-overflow')).toBeNull();
    });

    it('renders every value in the row even when total > inline limit (overflow is owned by More)', () => {
        const { container } = wrap(grp(['A', 'B', 'C', 'D', 'E', 'F']));
        expect(container.querySelectorAll('button').length).toBe(6);
    });

    it('returns null when the group does not exist in context', () => {
        const ctx: ProductOptionsContextValue = {
            product: {} as any,
            resolved: [],
            selection: {},
            selectVariant: () => {},
            selectedVariant: undefined,
            hoveredVariant: undefined,
            setHoveredVariant: () => {},
            renderers: {},
        };
        const { container } = render(
            <ProductOptionsContext.Provider value={ctx}>
                <Group name="Color" />
            </ProductOptionsContext.Provider>,
        );
        expect(container.firstChild).toBeNull();
    });
});
