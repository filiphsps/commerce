import { describe, expect, it } from 'vitest';

import { render } from '@/utils/test/react';

import { FilterValues } from '@/components/actionable/filter-values';

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
                                input: {}
                            }
                        ]}
                    />
                ).unmount()
            ).not.toThrow();
        });

        it('renders nothing when no values are provided', () => {
            const { container, unmount } = render(<FilterValues id={'id'} type={'BOOLEAN'} values={[]} />);

            expect(container.textContent).toBe('');
            expect(container.childElementCount).toBe(0);
            expect(unmount).not.toThrow();
        });

        // TODO: Add tests for the filter component.
    });
});
