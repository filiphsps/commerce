import { describe, expect, it, vi } from 'vitest';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { Locale } from '@/utils/locale';
import { render } from '@/utils/test/react';

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
    describe('Breadcrumbs', () => {
        it('should render without crashing', () => {
            const wrapper = render(<Breadcrumbs locale={Locale.default} />);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
