import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FilterValues } from '@/components/actionable/filter-values';
import { render } from '@/utils/test/react';

// `mock`-prefixed so the hoisted vi.mock factory may reference it; reset before each test.
let mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
    usePathname: () => '/en-US/products',
    useSearchParams: () => mockSearchParams,
}));

beforeEach(() => {
    mockSearchParams = new URLSearchParams();
});

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
            // Unknown types are silently ignored (no console.warn — the component
            // just returns null as a self-documenting empty render).
            const { container, unmount } = render(
                <FilterValues
                    id={'id'}
                    type={'INVALID' as any}
                    values={[{ id: 'a', label: 'A', count: 1, input: {} } as any]}
                />,
            );
            expect(container.textContent).toBe('');
            expect(container.childElementCount).toBe(0);
            expect(unmount).not.toThrow();
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

        it('links an inactive LIST value to setting its filter param', () => {
            const { container } = render(
                <FilterValues
                    id={'size'}
                    type={'LIST'}
                    values={[{ id: 'size.s', label: 'Small', count: 2, input: {} } as any]}
                />,
            );
            const link = container.querySelector('a[data-value="s"]')!;
            expect(link.getAttribute('href')).toBe('/en-US/products?size=s');
            expect(link.getAttribute('aria-current')).toBeNull();
        });

        it('toggles an active LIST value off by clearing its filter param', () => {
            mockSearchParams = new URLSearchParams('size=s');
            const { container } = render(
                <FilterValues
                    id={'size'}
                    type={'LIST'}
                    values={[
                        { id: 'size.s', label: 'Small', count: 2, input: {} } as any,
                        { id: 'size.m', label: 'Medium', count: 5, input: {} } as any,
                    ]}
                />,
            );
            const active = container.querySelector('a[data-value="s"]')!;
            // Clicking the active value removes it entirely — the deselect path.
            expect(active.getAttribute('href')).toBe('/en-US/products');
            expect(active.getAttribute('aria-current')).toBe('true');
            // A sibling value swaps the selection rather than stacking.
            expect(container.querySelector('a[data-value="m"]')!.getAttribute('href')).toBe('/en-US/products?size=m');
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
