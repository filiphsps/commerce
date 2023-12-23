import { describe, expect, it, vi } from 'vitest';

import Breadcrumbs from '@/components/informational/breadcrumbs';
import { render } from '@/utils/test/react';

describe('components', () => {
    describe('Breadcrumbs', () => {
        vi.mock('@shopify/hydrogen-react', async () => {
            return {
                useCart: vi.fn().mockReturnValue({
                    status: 'idle'
                }),
                useShop: vi.fn().mockReturnValue({})
            };
        });

        it('should render', () => {
            const wrapper = render(<Breadcrumbs shop={{ name: 'Mock Store' } as any} />);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
