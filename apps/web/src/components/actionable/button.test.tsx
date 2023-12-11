import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/actionable/button';
import { render } from '@/utils/test/react';

describe('components', () => {
    describe('Button', () => {
        vi.mock('@shopify/hydrogen-react', async () => {
            return {
                useCart: vi.fn().mockReturnValue({
                    status: 'idle'
                }),
                useShop: vi.fn().mockReturnValue({})
            };
        });

        it('should render', () => {
            const wrapper = render(<Button>Hello Button</Button>);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
