import { describe, expect, it } from 'vitest';

import PrismicPage from '@/components/prismic-page';
import { render } from '@testing-library/react';

describe('components', () => {
    describe('PrismicPage', () => {
        const propsBase = {
            locale: {
                locale: 'en-US',
                country: 'US',
                language: 'EN'
            },
            i18n: {},
            store: {}
        } as any;

        // TODO: Also test actually rendering slices.
        it('should render', () => {
            const props = {
                ...propsBase,
                page: {
                    slices: []
                }
            } as any;

            const wrapper = render(<PrismicPage {...props} />);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
