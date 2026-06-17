import { describe, expect, it } from 'vitest';
import { Pagination, resolveCurrentPage } from '@/components/actionable/pagination';
import { render } from '@/utils/test/react';

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

        it('marks the previous control aria-disabled on the first page and leaves next navigable', () => {
            // No ?page param resolves to the first page, so "previous" is at the lower bound.
            const wrapper = render(<Pagination i18n={i18n} knownFirstPage={1} knownLastPage={5} />);
            const disabled = wrapper.container.querySelectorAll('[aria-disabled="true"]');
            expect(disabled).toHaveLength(1);
            // The disabled control is a non-interactive span, never an anchor.
            expect(disabled[0]?.tagName).toBe('SPAN');
            expect(wrapper.container.querySelector('a[aria-disabled]')).toBeNull();
        });
    });

    describe('resolveCurrentPage', () => {
        it('parses a valid in-range page', () => {
            expect(resolveCurrentPage('3', 1, 5)).toBe(3);
        });

        it('falls back to the first page when the param is absent or non-numeric', () => {
            expect(resolveCurrentPage(null, 1, 5)).toBe(1);
            expect(resolveCurrentPage('', 1, 5)).toBe(1);
            // The old Number.isSafeInteger(string) guard let this through as NaN.
            expect(resolveCurrentPage('abc', 1, 5)).toBe(1);
        });

        it('clamps an out-of-range page into the known bounds', () => {
            expect(resolveCurrentPage('999', 1, 5)).toBe(5);
            expect(resolveCurrentPage('-2', 1, 5)).toBe(1);
        });
    });
});
