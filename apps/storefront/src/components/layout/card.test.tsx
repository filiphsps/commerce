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

        it('chrome="frameless" drops bg, hairline border, padding', () => {
            render(
                <Card chrome="frameless" data-testid="c">
                    content
                </Card>,
            );
            const el = screen.getByTestId('c');
            expect(el.className).not.toMatch(/\bp-3\b/);
            expect(el.className).not.toMatch(/\bbg-gray-100\b/);
            expect(el.className).not.toMatch(/\bborder-gray-200\b/);
        });

        it('chrome="boxed" (default) keeps the existing chrome', () => {
            render(
                <Card chrome="boxed" data-testid="c">
                    content
                </Card>,
            );
            const el = screen.getByTestId('c');
            expect(el.className).toMatch(/p-3/);
            expect(el.className).toMatch(/rounded-lg/);
        });
    });
});
