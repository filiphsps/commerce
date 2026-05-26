import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductOptionsContext } from '../context';
import Group from './group';
import More from './more';

const ctx = (resolved: { name: string; values: { name: string; selected?: boolean; available?: boolean }[] }[]) =>
    ({
        product: { handle: 'p' } as never,
        resolved: resolved.map((g) => ({
            name: g.name,
            values: g.values.map((v) => ({ name: v.name, selected: !!v.selected, available: v.available !== false })),
        })),
        selection: {},
        selectVariant: () => {},
        selectedVariant: undefined,
        hoveredVariant: undefined,
        setHoveredVariant: () => {},
        renderers: {},
    }) as never;

describe('+N chip — sibling groups', () => {
    it('per-group More renders the correct overflow for its OWN group, not the first one in DOM', () => {
        const { getByText, queryByText } = render(
            <ProductOptionsContext.Provider
                value={ctx([
                    { name: 'Size', values: [{ name: 'S' }, { name: 'M' }, { name: 'L' }, { name: 'XL' }] }, // 4 → no overflow
                    {
                        name: 'Color',
                        values: [
                            { name: 'A' },
                            { name: 'B' },
                            { name: 'C' },
                            { name: 'D' },
                            { name: 'E' },
                            { name: 'F' },
                        ],
                    }, // 6 → +2
                ])}
            >
                <div>
                    <Group name="Size" />
                    <More groupName="Size" />
                </div>
                <div>
                    <Group name="Color" />
                    <More groupName="Color" />
                </div>
            </ProductOptionsContext.Provider>,
        );

        // Size has 4 values, inline limit is 4 → no overflow → no More for size
        expect(queryByText('+0')).toBeNull();
        // Color has 6 values, inline limit is 4 → +2
        expect(getByText('+2')).toBeTruthy();
    });
});
