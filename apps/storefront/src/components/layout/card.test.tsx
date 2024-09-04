import { describe, expect, it } from 'vitest';

import { Card } from '@/components/layout/card';
import { render, screen } from '@/utils/test/react';

describe('components', () => {
    describe('Card', () => {
        it('renders without errors', () => {
            expect(() => render(<Card />).unmount()).not.toThrow();
        });

        it('renders the content', () => {
            const { container } = render(<Card>Hello</Card>);

            expect(container.textContent).toBe('Hello');
            expect(screen.getByText('Hello')).toBeDefined();
        });
    });
});
