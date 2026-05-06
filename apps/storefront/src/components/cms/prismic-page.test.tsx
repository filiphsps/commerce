import { describe, it, vi } from 'vitest';

//import PrismicPage from '@/components/cms/prismic-page';
//import { render } from '@/utils/test/react';

vi.mock('@shopify/hydrogen-react', async () => {
    return {
        useCart: vi.fn().mockReturnValue({
            status: 'idle',
        }),
        useShop: vi.fn().mockReturnValue({}),
        useShopifyCookies: vi.fn().mockReturnValue({}),
    };
});

describe('components', () => {
    describe('PrismicPage', () => {
        const propsBase = {
            locale: {
                locale: 'en-US',
                country: 'US',
                language: 'EN',
            },
            i18n: {},
            store: {},
        } as any;

        // TODO: Also test actually rendering slices.
        // FIXME: Support react server components in tests.
        it.todo('should render without crashing', () => {
            // eslint-disable-next-line unused-imports/no-unused-vars
            const _props = {
                ...propsBase,
                page: {
                    slices: [],
                },
            } as any;

            //const wrapper = render(<PrismicPage {...props} />);

            //expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
