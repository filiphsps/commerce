import { describe, expect, it } from 'vitest';

import { render } from '@/utils/test/react';

import { Filters } from '@/components/actionable/filters';

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

        // TODO: Add tests for the filter component.
    });
});
