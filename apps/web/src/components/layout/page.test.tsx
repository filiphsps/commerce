import { describe, expect, it, vi } from 'vitest';

import { Page } from '@/components/layout/page';
import { render } from '@/utils/test/react';

describe('components', () => {
    describe('Page', () => {
        vi.mock('@shopify/hydrogen-react', async () => {
            return {
                useCart: vi.fn().mockReturnValue({
                    status: 'idle'
                }),
                useShop: vi.fn().mockReturnValue({})
            };
        });

        it('should render', () => {
            const wrapper = render(<Page>Hello world!</Page>);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
