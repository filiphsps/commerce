import { describe, expect, it } from 'vitest';
import { FilterValues } from '@/components/actionable/filter-values';
import { render } from '@/utils/test/react';

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
            const { container, unmount } = render(<FilterValues id={'id'} type={'INVALID' as any} values={[]} />);
            expect(container.textContent).toBe('');
            expect(container.childElementCount).toBe(0);
            expect(unmount).not.toThrow();
        });

        it.skip('parses and renders a ´BOOLEAN´ type', () => {
            const { unmount } = render(<FilterValues id={'id'} type={'BOOLEAN'} values={[]} />);

            expect(unmount).not.toThrow();
        });
        it.skip('parses and renders a LIST type', () => {
            const { unmount } = render(<FilterValues id={'id'} type={'LIST'} values={[]} />);

            expect(unmount).not.toThrow();
        });
        it.skip('parses and renders a PRICE_RANGE type', () => {
            const { unmount } = render(<FilterValues id={'id'} type={'PRICE_RANGE'} values={[]} />);

            expect(unmount).not.toThrow();
        });
    });
});
