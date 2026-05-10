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
        // TODO: Also test actually rendering slices.
        // FIXME: Support react server components in tests.
        it.todo('should render without crashing', () => {
            //const wrapper = render(<PrismicPage {...props} />);
            //expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
