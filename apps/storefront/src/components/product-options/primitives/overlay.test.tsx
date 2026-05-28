import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@/utils/test/react';
import { ProductOptionsContext } from '../context';
import type { ProductOptionsContextValue, ResolvedOption } from '../types';
import Overlay from './overlay';

const originalMatchMedia = window.matchMedia;

/**
 * Pin `useIsDesktop` for a single test: `true` forces the popover branch,
 * `false` the bottom-sheet branch, and `null` removes `matchMedia` entirely so
 * the SSR/first-render sentinel branch renders its static trigger.
 *
 * @param isDesktop - Desired viewport resolution, or `null` for "unknown".
 */
function setViewport(isDesktop: boolean | null): void {
    const value =
        isDesktop === null
            ? undefined
            : (vi.fn().mockReturnValue({
                  matches: isDesktop,
                  media: '(min-width: 48em)',
                  addEventListener: vi.fn(),
                  removeEventListener: vi.fn(),
              }) as unknown as typeof window.matchMedia);
    Object.defineProperty(window, 'matchMedia', { configurable: true, value });
}

/**
 * Render `<Overlay>` with a context built from `overrides`, defaulting the
 * non-overridden fields to inert values.
 *
 * @param overrides - Partial context; must include `resolved`.
 * @param groupName - Group the overlay targets (defaults to `Color`).
 * @returns The Testing Library render result.
 */
function renderOverlay(
    overrides: Partial<ProductOptionsContextValue> & { resolved: ResolvedOption[] },
    groupName = 'Color',
) {
    const ctx: ProductOptionsContextValue = {
        product: {} as never,
        selection: {},
        selectVariant: () => {},
        selectedVariant: undefined,
        hoveredVariant: undefined,
        setHoveredVariant: () => {},
        renderers: {},
        ...overrides,
    };
    return render(
        <ProductOptionsContext.Provider value={ctx}>
            <Overlay groupName={groupName} />
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
    afterEach(() => {
        Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia });
        vi.clearAllMocks();
    });

    it('renders content into a portal when triggered', () => {
        renderOverlay({ resolved: [grp] });
        fireEvent.click(screen.getByLabelText('Show all Color options'));
        const content =
            document.body.querySelector('[data-state="open"][role="dialog"]') ||
            document.body.querySelector('[data-radix-popper-content-wrapper]');
        expect(content).toBeTruthy();
    });

    it('closes on Escape', () => {
        renderOverlay({ resolved: [grp] });
        fireEvent.click(screen.getByLabelText('Show all Color options'));
        fireEvent.keyDown(document.body, { key: 'Escape' });
        const open = document.body.querySelector('[data-state="open"]');
        expect(open).toBeNull();
    });

    it('renders nothing when the named group is absent', () => {
        const { container } = renderOverlay({ resolved: [grp] }, 'Size');
        expect(container.firstChild).toBeNull();
    });

    it('renders a static, inert trigger while the viewport is still unknown (SSR sentinel)', () => {
        setViewport(null);
        renderOverlay({ resolved: [grp] });
        const trigger = screen.getByLabelText('Show all Color options');
        expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
        // No Radix root is mounted yet, so a click cannot open any surface.
        fireEvent.click(trigger);
        expect(document.body.querySelector('[data-state="open"]')).toBeNull();
    });

    it('desktop: selecting a value layers it onto the current selection and closes the popover', () => {
        setViewport(true);
        const selectVariant = vi.fn();
        renderOverlay({
            resolved: [
                {
                    name: 'Color',
                    values: [
                        { name: 'Red', selected: true, available: true, swatch: { color: '#f00' } },
                        { name: 'Green', selected: false, available: true, swatch: { color: '#0f0' } },
                    ],
                },
            ],
            selection: { Color: 'Red' },
            selectVariant,
        });
        fireEvent.click(screen.getByLabelText('Show all Color options'));
        const green = Array.from(document.body.querySelectorAll('button')).find((b) => b.textContent === 'Green');
        fireEvent.click(green as HTMLButtonElement);
        expect(selectVariant).toHaveBeenCalledWith({ Color: 'Green' });
        expect(document.body.querySelector('[data-state="open"]')).toBeNull();
    });

    it('mobile: opens a bottom sheet, flags out-of-stock values, and selects on tap', () => {
        setViewport(false);
        const selectVariant = vi.fn();
        renderOverlay({
            resolved: [
                {
                    name: 'Color',
                    values: [
                        { name: 'Red', selected: false, available: true, swatch: { color: '#f00' } },
                        { name: 'Blue', selected: false, available: false },
                    ],
                },
            ],
            selectVariant,
        });
        fireEvent.click(screen.getByLabelText('Show all Color options'));
        expect(document.body.querySelector('[role="dialog"]')).toBeTruthy();
        const outLabels = Array.from(document.body.querySelectorAll('small')).map((s) => s.textContent);
        expect(outLabels).toContain('Out');
        const red = Array.from(document.body.querySelectorAll('button')).find((b) => b.textContent === 'Red');
        fireEvent.click(red as HTMLButtonElement);
        expect(selectVariant).toHaveBeenCalledWith({ Color: 'Red' });
        expect(document.body.querySelector('[data-state="open"]')).toBeNull();
    });
});
