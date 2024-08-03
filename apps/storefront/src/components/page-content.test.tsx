import { describe, expect, it, vi } from 'vitest';

import { render } from '@/utils/test/react';

import PageContent from '@/components/page-content';

describe('components', () => {
    describe('PageContent', () => {
        vi.mock('@shopify/hydrogen-react', async () => {
            return {
                ...((await vi.importActual('@shopify/hydrogen-react')) || {}),
                useCart: vi.fn().mockReturnValue({
                    status: 'idle'
                }),
                useShop: vi.fn().mockReturnValue({}),
                useShopifyCookies: vi.fn().mockReturnValue({})
            };
        });

        it('should render', () => {
            const wrapper = render(<PageContent />);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
