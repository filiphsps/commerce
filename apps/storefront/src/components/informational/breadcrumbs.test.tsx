import { describe, expect, it, vi } from 'vitest';

import React from 'react';

import { render } from '@/utils/test/react';

import Breadcrumbs from '@/components/informational/breadcrumbs';

describe('components', () => {
    describe('Breadcrumbs', () => {
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
            const wrapper = render(<Breadcrumbs shop={{ name: 'Mock Store' } as any} />);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
