import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ResolvedOption, ResolvedOptionValue } from '../types';
import Swatch from './swatch';

const baseGroup: ResolvedOption = { name: 'Color', values: [] };

function mkValue(overrides: Partial<ResolvedOptionValue> = {}): ResolvedOptionValue {
    return {
        name: 'Red',
        selected: false,
        available: true,
        swatch: { color: '#ff0000' },
        variant: undefined,
        ...overrides,
    };
}

describe('Swatch', () => {
    it('renders a button labeled with the value name', () => {
        const { getByRole } = render(
            <Swatch group={baseGroup} value={mkValue()} onSelect={() => {}} density="compact" />,
        );
        expect(getByRole('button', { name: /red/i })).toBeTruthy();
    });

    it('paints the swatch color via CSS custom property', () => {
        const { container } = render(
            <Swatch group={baseGroup} value={mkValue()} onSelect={() => {}} density="compact" />,
        );
        const visual = container.querySelector('[data-swatch-visual]') as HTMLElement;
        expect(visual.style.getPropertyValue('--swatch-color')).toBe('#ff0000');
    });

    it('marks the active state when selected', () => {
        const { container } = render(
            <Swatch group={baseGroup} value={mkValue({ selected: true })} onSelect={() => {}} density="compact" />,
        );
        expect(container.querySelector('[data-active="true"]')).toBeTruthy();
    });

    it('marks the out-of-stock state when not available', () => {
        const { container } = render(
            <Swatch group={baseGroup} value={mkValue({ available: false })} onSelect={() => {}} density="compact" />,
        );
        expect(container.querySelector('[data-available="false"]')).toBeTruthy();
    });

    it('renders an image swatch when swatch.image is present', () => {
        const value = mkValue({ swatch: { image: { url: 'https://cdn/img.png' } } });
        const { container } = render(<Swatch group={baseGroup} value={value} onSelect={() => {}} density="compact" />);
        const img = container.querySelector('img');
        expect(img?.getAttribute('src')).toBe('https://cdn/img.png');
    });

    it('calls onSelect when clicked', () => {
        const onSelect = vi.fn();
        const { getByRole } = render(
            <Swatch group={baseGroup} value={mkValue()} onSelect={onSelect} density="compact" />,
        );
        fireEvent.click(getByRole('button'));
        expect(onSelect).toHaveBeenCalledOnce();
    });
});
