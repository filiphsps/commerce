import { describe, expect, it } from 'vitest';

import { render } from '@/utils/test/react';

import { AttributeIcon } from '@/components/products/attribute-icon';

describe('components', () => {
    describe('AttributeIcon', () => {
        it('renders without errors', () => {
            expect(() => render(<AttributeIcon />).unmount()).not.toThrow();
        });

        it('renders the attribute icon', () => {
            const { container, unmount } = render(<AttributeIcon data={'apple'} />);

            expect(container.innerHTML).toContain('<svg');
            expect(unmount).not.toThrow();
        });

        it('renders nothing when no attribute is present', () => {
            const { container, unmount } = render(<AttributeIcon />);

            expect(container.textContent).toBe('');
            expect(container.childElementCount).toBe(0);
            expect(unmount).not.toThrow();
        });

        it('renders the attribute icon with a class', () => {
            const { container, unmount } = render(<AttributeIcon data={'apple'} className={'stroke-current'} />);

            expect(container.querySelector('svg')?.classList.contains('stroke-current')).toBe(true);
            expect(unmount).not.toThrow();
        });

        it('renders nothing with an invalid attribute', () => {
            const { container, unmount } = render(<AttributeIcon data={'invalid'} />);

            expect(container.textContent).toBe('');
            expect(container.childElementCount).toBe(0);
            expect(unmount).not.toThrow();
        });
    });
});
