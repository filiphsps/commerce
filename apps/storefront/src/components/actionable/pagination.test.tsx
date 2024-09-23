import { describe, expect, it } from 'vitest';

import { render } from '@/utils/test/react';

import { Pagination } from '@/components/actionable/pagination';

describe('components', () => {
    describe('Pagination', () => {
        const i18n = {} as any;

        it('should render without crashing', () => {
            const wrapper = render(<Pagination i18n={i18n} knownFirstPage={1} knownLastPage={5} />);
            expect(() => wrapper.unmount()).not.toThrow();
        });

        it('should not render if knownFirstPage and knownLastPage are the same', () => {
            const wrapper = render(<Pagination i18n={i18n} knownFirstPage={1} knownLastPage={1} />);
            expect(wrapper.container).toBeEmptyDOMElement();
            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
