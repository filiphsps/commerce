import { describe, expect, it, vi } from 'vitest';
// Use the per-render `container` rather than the project's `screen` helper —
// `screen` in @/utils/test/react captures document.body at import time, which
// goes stale across happy-dom test contexts.
import { render } from '@/utils/test/react';
import FloatPill from './float-pill';

describe('float-pill CTA', () => {
    const base = {
        productHandle: 'tee',
        seedVariantId: 'v1',
        isOpen: false,
        onActivate: vi.fn(),
        onAdd: vi.fn(),
    };

    it('renders icon-only with "choose options" aria-label when not single-buyable', () => {
        const { container } = render(<FloatPill {...base} isSingleBuyable={false} />);
        const btn = container.querySelector('button');
        expect(btn).toBeTruthy();
        expect(btn?.getAttribute('aria-label')).toMatch(/choose options/i);
    });

    it('shows fast-path dot via data-fast-path when single buyable', () => {
        const { container } = render(<FloatPill {...base} isSingleBuyable={true} />);
        const btn = container.querySelector('button');
        expect(btn).toBeTruthy();
        expect(btn?.getAttribute('data-fast-path')).toBe('');
    });

    it('open state swaps icon and aria-label to "close"', () => {
        const { container } = render(<FloatPill {...base} isOpen={true} isSingleBuyable={false} />);
        const btn = container.querySelector('button');
        expect(btn).toBeTruthy();
        expect(btn?.getAttribute('aria-label')).toMatch(/close/i);
    });

    it('clicking fires onAdd when single-buyable, onActivate otherwise', () => {
        const onAdd = vi.fn();
        const onActivate = vi.fn();
        const { container, rerender } = render(
            <FloatPill {...base} isSingleBuyable={true} onAdd={onAdd} onActivate={onActivate} />,
        );
        (container.querySelector('button') as HTMLButtonElement).click();
        expect(onAdd).toHaveBeenCalledOnce();
        expect(onActivate).not.toHaveBeenCalled();

        onAdd.mockClear();
        onActivate.mockClear();
        rerender(<FloatPill {...base} isSingleBuyable={false} onAdd={onAdd} onActivate={onActivate} />);
        (container.querySelector('button') as HTMLButtonElement).click();
        expect(onActivate).toHaveBeenCalledOnce();
        expect(onAdd).not.toHaveBeenCalled();
    });
});
