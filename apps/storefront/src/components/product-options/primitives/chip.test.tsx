import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ResolvedOption, ResolvedOptionValue } from '../types';
import Chip from './chip';

const grp: ResolvedOption = { name: 'Size', values: [] };
const mkValue = (overrides: Partial<ResolvedOptionValue> = {}): ResolvedOptionValue => ({
    name: 'M',
    selected: false,
    available: true,
    ...overrides,
});

describe('Chip', () => {
    it('renders the value name', () => {
        const { getByRole } = render(<Chip group={grp} value={mkValue()} onSelect={() => {}} density="compact" />);
        expect(getByRole('button').textContent).toBe('M');
    });

    it('marks the active state when selected', () => {
        const { container } = render(
            <Chip group={grp} value={mkValue({ selected: true })} onSelect={() => {}} density="compact" />,
        );
        expect(container.querySelector('[data-active="true"]')).toBeTruthy();
    });

    it('marks out-of-stock', () => {
        const { container } = render(
            <Chip group={grp} value={mkValue({ available: false })} onSelect={() => {}} density="compact" />,
        );
        expect(container.querySelector('[data-available="false"]')).toBeTruthy();
    });

    it('calls onSelect on click', () => {
        const onSelect = vi.fn();
        const { getByRole } = render(<Chip group={grp} value={mkValue()} onSelect={onSelect} density="compact" />);
        fireEvent.click(getByRole('button'));
        expect(onSelect).toHaveBeenCalledOnce();
    });
});
