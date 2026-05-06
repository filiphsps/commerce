import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/actionable/button';
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
    describe('Button', () => {
        it('should render without crashing', () => {
            const wrapper = render(<Button>Hello Button</Button>);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
