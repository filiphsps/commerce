import { describe, expect, it, vi } from 'vitest';
// Use the per-render `container` rather than the project's `screen` helper —
// `screen` in @/utils/test/react captures document.body at import time, which
// goes stale across happy-dom test contexts.
import { render } from '@/utils/test/react';
import InlineButton from './inline-button';

const base = {
    productHandle: 'tee',
    seedVariantId: 'v1',
    isOpen: false,
    onActivate: vi.fn(),
    onAdd: vi.fn(),
};

describe('inline-button CTA', () => {
    it('renders Add to bag label', () => {
        const { container } = render(<InlineButton {...base} isSingleBuyable={false} />);
        const btn = container.querySelector('button') as HTMLButtonElement;
        expect(btn).toBeTruthy();
        expect(btn.textContent).toMatch(/add to bag/i);
    });

    it('full-width 44px touch target', () => {
        const { container } = render(<InlineButton {...base} isSingleBuyable={false} />);
        const btn = container.querySelector('button') as HTMLButtonElement;
        expect(btn.className).toMatch(/h-11/);
        expect(btn.className).toMatch(/w-full/);
    });

    it('calls onAdd directly when product is single-buyable', () => {
        const onActivate = vi.fn();
        const onAdd = vi.fn();
        const { container } = render(
            <InlineButton {...base} isSingleBuyable={true} onActivate={onActivate} onAdd={onAdd} />,
        );
        const btn = container.querySelector('button') as HTMLButtonElement;
        btn.click();
        expect(onAdd).toHaveBeenCalledTimes(1);
        expect(onActivate).not.toHaveBeenCalled();
    });

    it('calls onActivate when product needs option selection', () => {
        const onActivate = vi.fn();
        const onAdd = vi.fn();
        const { container } = render(
            <InlineButton {...base} isSingleBuyable={false} onActivate={onActivate} onAdd={onAdd} />,
        );
        const btn = container.querySelector('button') as HTMLButtonElement;
        btn.click();
        expect(onActivate).toHaveBeenCalledTimes(1);
        expect(onAdd).not.toHaveBeenCalled();
    });

    it('renders as a type=button element', () => {
        const { container } = render(<InlineButton {...base} isSingleBuyable={false} />);
        const btn = container.querySelector('button') as HTMLButtonElement;
        expect(btn.getAttribute('type')).toBe('button');
    });
});
