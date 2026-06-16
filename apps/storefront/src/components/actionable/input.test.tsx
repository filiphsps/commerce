import { describe, expect, it } from 'vitest';
import { Input, MultilineInput } from '@/components/actionable/input';
import { render } from '@/utils/test/react';

describe('components', () => {
    describe('Input', () => {
        it('carries the shared focus-ring so keyboard focus stays visible', () => {
            const { container } = render(<Input aria-label="field" />);
            expect(container.querySelector('input')!.className).toContain('focus-ring');
        });

        it('does not suppress the focus outline', () => {
            const { container } = render(<Input aria-label="field" />);
            // The old default removed the indicator entirely (WCAG 2.4.7 regression).
            expect(container.querySelector('input')!.className).not.toContain('focus:outline-none');
        });

        it('merges caller classNames after the base chassis', () => {
            const { container } = render(<Input aria-label="field" className="text-sm" />);
            expect(container.querySelector('input')!.className).toContain('text-sm');
        });
    });

    describe('MultilineInput', () => {
        it('carries the shared focus-ring', () => {
            const { container } = render(<MultilineInput>{''}</MultilineInput>);
            expect(container.querySelector('textarea')!.className).toContain('focus-ring');
        });
    });
});
