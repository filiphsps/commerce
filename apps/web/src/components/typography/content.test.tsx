import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Content } from '@/components/typography/content';
import { render } from '@/utils/test/react';

describe('components', () => {
    describe('Content', () => {
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
            const wrapper = render(<Content />);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
