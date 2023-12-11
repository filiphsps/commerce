import { describe, expect, it, vi } from 'vitest';

import PrismicPage from '@/components/prismic-page';
import { render } from '@/utils/test/react';

describe('components', () => {
    describe('PrismicPage', () => {
        vi.mock('@shopify/hydrogen-react', async () => {
            return {
                useCart: vi.fn().mockReturnValue({
                    status: 'idle'
                }),
                useShop: vi.fn().mockReturnValue({})
            };
        });

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
