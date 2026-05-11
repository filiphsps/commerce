import { describe, expect, it, vi } from 'vitest';
import { Filters } from '@/components/actionable/filters';
import { render } from '@/utils/test/react';

vi.mock('next/navigation', () => ({
    usePathname: () => '/en-US/test',
    useSearchParams: () => new URLSearchParams(),
}));

describe('components', () => {
    describe('Filters', () => {
        it('renders without errors', () => {
            expect(() => render(<Filters filters={[]} />).unmount()).not.toThrow();
        });

        it('renders nothing when no filter is provided', () => {
            const { container, unmount } = render(<Filters filters={[]} />);

            expect(container.textContent).toBe('');
            expect(container.childElementCount).toBe(0);
            expect(unmount).not.toThrow();
        });

        it('renders one card per filter with its label', () => {
            const { container } = render(
                <Filters
                    filters={[
                        { id: 'a', label: 'Size', type: 'LIST', values: [] } as any,
                        { id: 'b', label: 'Color', type: 'LIST', values: [] } as any,
                    ]}
                />,
            );
            expect(container.textContent).toContain('Size');
            expect(container.textContent).toContain('Color');
        });

        it('applies disabled styles when disabled prop is set', () => {
            const { container } = render(
                <Filters filters={[{ id: 'a', label: 'Size', type: 'LIST', values: [] } as any]} disabled={true} />,
            );
            const section = container.querySelector('section');
            expect(section?.className).toContain('pointer-events-none');
            expect(section?.className).toContain('brightness-50');
        });

        it('merges custom className with built-in classes', () => {
            const { container } = render(
                <Filters
                    filters={[{ id: 'a', label: 'Size', type: 'LIST', values: [] } as any]}
                    className="custom-class"
                />,
            );
            const section = container.querySelector('section');
            expect(section?.className).toContain('custom-class');
            expect(section?.className).toContain('flex');
        });
    });
});
