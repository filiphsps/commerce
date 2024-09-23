import { describe, expect, it, vi } from 'vitest';

import { Locale } from '@/utils/locale';
import { render } from '@/utils/test/react';

import Breadcrumbs from '@/components/informational/breadcrumbs';

describe('components', () => {
    describe('Breadcrumbs', () => {
        vi.mock('@shopify/hydrogen-react', async () => {
            return {
                useCart: vi.fn().mockReturnValue({
                    status: 'idle'
                }),
                useShop: vi.fn().mockReturnValue({}),
                useShopifyCookies: vi.fn().mockReturnValue({})
            };
        });

        it('should render without crashing', () => {
            const wrapper = render(<Breadcrumbs locale={Locale.default} />);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
