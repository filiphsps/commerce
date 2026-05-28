import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductOptionsContext } from '../context';
import type { ProductOptionsContextValue, ResolvedOption } from '../types';
import More from './more';

/**
 * Render `<More>` for a single named group inside a minimal options context.
 *
 * @param resolved - Resolved option groups placed on the context.
 * @param groupName - Group the `More` control should count overflow for.
 * @param props - Optional `onClick`/`className` overrides forwarded to `More`.
 * @returns The Testing Library render result.
 */
function renderMore(
    resolved: ResolvedOption[],
    groupName: string,
    props: { onClick?: () => void; className?: string } = {},
) {
    const ctx: ProductOptionsContextValue = {
        product: {} as never,
        resolved,
        selection: {},
        selectVariant: () => {},
        selectedVariant: undefined,
        hoveredVariant: undefined,
        setHoveredVariant: () => {},
        renderers: {},
    };
    return render(
        <ProductOptionsContext.Provider value={ctx}>
            <More groupName={groupName} {...props} />
        </ProductOptionsContext.Provider>,
    );
}

/**
 * Build a `Size` group with `n` values, all selectable and available.
 *
 * @param n - Number of option values to generate.
 * @returns The resolved option group.
 */
const sizeGroup = (n: number): ResolvedOption => ({
    name: 'Size',
    values: Array.from({ length: n }, (_, i) => ({ name: `S${i}`, selected: false, available: true })),
});

describe('More', () => {
    it('renders nothing when the named group is absent', () => {
        const { container } = renderMore([sizeGroup(6)], 'Color');
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing when the group has four or fewer values (no overflow)', () => {
        const { container } = renderMore([sizeGroup(4)], 'Size');
        expect(container.firstChild).toBeNull();
    });

    it('renders the count of values beyond the inline limit of four', () => {
        const { getByRole } = renderMore([sizeGroup(7)], 'Size');
        const btn = getByRole('button', { name: 'Show all Size options' });
        expect(btn.textContent).toBe('+3');
        expect(btn).toHaveAttribute('data-option-more');
    });

    it('invokes onClick when pressed', () => {
        const onClick = vi.fn();
        const { getByRole } = renderMore([sizeGroup(6)], 'Size', { onClick });
        fireEvent.click(getByRole('button'));
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('uses the default pill class when none is supplied', () => {
        const { getByRole } = renderMore([sizeGroup(6)], 'Size');
        expect(getByRole('button').className).toContain('product-options-more');
    });

    it('replaces the default class entirely when a custom class is supplied', () => {
        const { getByRole } = renderMore([sizeGroup(6)], 'Size', { className: 'custom-more' });
        expect(getByRole('button').className).toBe('custom-more');
    });
});
