import { describe, expect, it, vi } from 'vitest';
import { Content } from '@/components/typography/content';
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
    describe('Content', () => {
        it('should render', () => {
            const wrapper = render(<Content />);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
