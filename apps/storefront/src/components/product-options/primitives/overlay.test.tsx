import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@/utils/test/react';
import { ProductOptionsContext } from '../context';
import type { ProductOptionsContextValue, ResolvedOption } from '../types';
import Overlay from './overlay';

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
            <Overlay groupName="Color" />
        </ProductOptionsContext.Provider>,
    );
}

const grp: ResolvedOption = {
    name: 'Color',
    values: [
        { name: 'Red', selected: false, available: true, swatch: { color: '#f00' } },
        { name: 'Green', selected: false, available: true, swatch: { color: '#0f0' } },
    ],
};

describe('Overlay', () => {
    it('renders content into a portal when triggered', () => {
        wrap(grp);
        fireEvent.click(screen.getByLabelText('Show all Color options'));
        const content =
            document.body.querySelector('[data-state="open"][role="dialog"]') ||
            document.body.querySelector('[data-radix-popper-content-wrapper]');
        expect(content).toBeTruthy();
    });

    it('closes on Escape', () => {
        wrap(grp);
        fireEvent.click(screen.getByLabelText('Show all Color options'));
        fireEvent.keyDown(document.body, { key: 'Escape' });
        const open = document.body.querySelector('[data-state="open"]');
        expect(open).toBeNull();
    });
});
