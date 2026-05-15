import { describe, expect, it, vi } from 'vitest';
import { TextChipRenderer } from '@/components/product-options-selector/renderers/text-chip-renderer';
import { fireEvent, render, screen } from '@/utils/test/react';

const baseProps = {
    name: 'Size',
    value: 'M',
    selected: false,
    available: true,
    exists: true,
    isDifferentProduct: false,
    variant: { id: 'gid://shopify/ProductVariant/1' } as any,
    onSelect: () => {},
    density: 'spacious' as const,
};

describe('components', () => {
    describe('TextChipRenderer', () => {
        it('renders the value as the visible label', () => {
            render(<TextChipRenderer {...baseProps} />);
            expect(screen.getByText('M')).toBeInTheDocument();
        });

        it('renders a <button> when no href is supplied', () => {
            render(<TextChipRenderer {...baseProps} />);
            const el = screen.getByRole('button', { name: 'Size: M' });
            expect(el.tagName).toBe('BUTTON');
        });

        it('renders an <a> when href is supplied', () => {
            render(<TextChipRenderer {...baseProps} href="/products/abc/?variant=1" />);
            const el = screen.getByRole('link', { name: 'Size: M' });
            expect(el.tagName).toBe('A');
            expect(el.getAttribute('href')).toBe('/products/abc/?variant=1');
        });

        it('calls onSelect on click', () => {
            const onSelect = vi.fn();
            render(<TextChipRenderer {...baseProps} onSelect={onSelect} />);
            fireEvent.click(screen.getByRole('button', { name: 'Size: M' }));
            expect(onSelect).toHaveBeenCalledTimes(1);
        });

        it('applies the selected class when selected', () => {
            render(<TextChipRenderer {...baseProps} selected={true} />);
            expect(screen.getByRole('button', { name: 'Size: M' }).className).toMatch(/selected/);
        });

        it('applies the disabled class and aria-disabled when not available', () => {
            const onSelect = vi.fn();
            render(<TextChipRenderer {...baseProps} available={false} onSelect={onSelect} />);
            const el = screen.getByRole('button', { name: 'Size: M' });
            expect(el.className).toMatch(/disabled/);
            expect(el.getAttribute('aria-disabled')).toBe('true');
            fireEvent.click(el);
            expect(onSelect).not.toHaveBeenCalled();
        });

        it('sets aria-label to "{name}: {value}" in spacious density', () => {
            render(<TextChipRenderer {...baseProps} density="spacious" />);
            expect(screen.getByLabelText('Size: M')).toBeInTheDocument();
        });

        it('sets aria-label to "{name}: {value}" in compact density', () => {
            render(<TextChipRenderer {...baseProps} density="compact" />);
            expect(screen.getByLabelText('Size: M')).toBeInTheDocument();
        });

        it('applies the compact class when density is compact', () => {
            render(<TextChipRenderer {...baseProps} density="compact" />);
            expect(screen.getByRole('button', { name: 'Size: M' }).className).toMatch(/compact/);
        });
    });
});
