import { describe, expect, it, vi } from 'vitest';

import { render } from '@/utils/test/react';

import { Content } from '@/components/typography/content';

describe('components', () => {
    describe('Content', () => {
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
            const wrapper = render(<Content />);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
