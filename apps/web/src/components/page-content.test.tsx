import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import PageContent from '@/components/page-content';
import { render } from '@/utils/test/react';

describe('components', () => {
    describe('PageContent', () => {
        vi.mock('@shopify/hydrogen-react', async () => {
            return {
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
