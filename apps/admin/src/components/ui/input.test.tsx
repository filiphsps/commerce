import { describe, expect, it } from 'vitest';
import { Input } from '@/components/ui/input';
import { render, screen } from '@/utils/test/react';

describe('Input', () => {
    it('renders an input carrying the base styling', () => {
        render(<Input aria-label="Token" />);
        expect(screen.getByLabelText('Token').className).toMatch(/border-border/);
    });

    it('merges a passed className', () => {
        render(<Input aria-label="Token" className="font-mono" />);
        expect(screen.getByLabelText('Token').className).toMatch(/font-mono/);
    });

    it('forwards native input props', () => {
        render(<Input aria-label="Token" placeholder="1rem" disabled />);
        const input = screen.getByLabelText('Token') as HTMLInputElement;
        expect(input.placeholder).toBe('1rem');
        expect(input.disabled).toBe(true);
    });
});
