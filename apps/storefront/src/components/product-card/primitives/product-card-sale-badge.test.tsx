import { describe, expect, it } from 'vitest';
// Use the per-render `container` rather than the project's `screen` helper —
// `screen` in @/utils/test/react captures document.body at import time, which
// goes stale across happy-dom test contexts.
import { render } from '@/utils/test/react';
import ProductCardSaleBadge from './product-card-sale-badge';

describe('ProductCardSaleBadge', () => {
    it('does not render when discount is below min threshold (11%)', () => {
        const { container } = render(<ProductCardSaleBadge discountPercent={5} style="default" position="top-left" />);
        expect(container.textContent).toBe('');
    });

    it('renders with template "−{n}%" when discount is sufficient', () => {
        const { container } = render(<ProductCardSaleBadge discountPercent={20} style="default" position="top-left" />);
        expect(container.textContent).toBe('−20%');
    });

    it('honors the style enum via data-style', () => {
        const { container } = render(<ProductCardSaleBadge discountPercent={20} style="accent" position="top-right" />);
        const el = container.querySelector('[data-style]') as HTMLElement;
        expect(el.getAttribute('data-style')).toBe('accent');
        expect(el.getAttribute('data-position')).toBe('top-right');
    });
});
