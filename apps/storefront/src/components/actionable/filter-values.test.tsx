import { describe, expect, it, vi } from 'vitest';
import { FilterValues } from '@/components/actionable/filter-values';
import { render } from '@/utils/test/react';

vi.mock('next/navigation', () => ({
    usePathname: () => '/en-US/products',
    useSearchParams: () => new URLSearchParams(),
}));

describe('components', () => {
    describe('FilterValues', () => {
        it('renders without errors', () => {
            expect(() =>
                render(
                    <FilterValues
                        id={'id'}
                        type={'BOOLEAN'}
                        values={[
                            {
                                id: 'id',
                                label: 'label',
                                count: 123,
                                input: {},
                            },
                        ]}
                    />,
                ).unmount(),
            ).not.toThrow();
        });

        it('renders nothing when no values are provided', () => {
            const { container, unmount } = render(<FilterValues id={'id'} type={'BOOLEAN'} values={[]} />);

            expect(container.textContent).toBe('');
            expect(container.childElementCount).toBe(0);
            expect(unmount).not.toThrow();
        });

        it('returns null when an invalid type is provided', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const { container, unmount } = render(
                <FilterValues
                    id={'id'}
                    type={'INVALID' as any}
                    values={[{ id: 'a', label: 'A', count: 1, input: {} } as any]}
                />,
            );
            expect(container.textContent).toBe('');
            expect(container.childElementCount).toBe(0);
            expect(warnSpy).toHaveBeenCalled();
            expect(unmount).not.toThrow();
            warnSpy.mockRestore();
        });

        it('parses and renders a BOOLEAN type', () => {
            const { container } = render(
                <FilterValues
                    id={'available'}
                    type={'BOOLEAN'}
                    values={[{ id: 'true', label: 'In stock', count: 5, input: {} } as any]}
                />,
            );
            expect(container.textContent).toContain('BOOLEAN');
        });

        it('parses and renders a LIST type with one link per value', () => {
            const { container } = render(
                <FilterValues
                    id={'size'}
                    type={'LIST'}
                    values={[
                        { id: 'size.s', label: 'Small', count: 2, input: {} } as any,
                        { id: 'size.m', label: 'Medium', count: 5, input: {} } as any,
                        { id: 'size.l', label: 'Large', count: 1, input: {} } as any,
                    ]}
                />,
            );
            const links = container.querySelectorAll('a');
            expect(links.length).toBe(3);
            expect(container.textContent).toContain('Small');
            expect(container.textContent).toContain('Medium');
            expect(container.textContent).toContain('Large');
        });

        it('renders count next to each LIST value', () => {
            const { container } = render(
                <FilterValues
                    id={'size'}
                    type={'LIST'}
                    values={[{ id: 'size.s', label: 'Small', count: 42, input: {} } as any]}
                />,
            );
            expect(container.textContent).toContain('(42)');
        });

        it('parses and renders a PRICE_RANGE type', () => {
            const { container } = render(
                <FilterValues
                    id={'price'}
                    type={'PRICE_RANGE'}
                    values={[{ id: 'price.0-100', label: '0-100', count: 10, input: {} } as any]}
                />,
            );
            expect(container.textContent).toContain('PRICE_RANGE');
        });
    });
});
