import { describe, expect, it, vi } from 'vitest';

import React from 'react';

import { render } from '@/utils/test/react';

import { Label } from '@/components/typography/label';

vi.mock('@shopify/hydrogen-react', async () => {
    return {
        useCart: vi.fn().mockReturnValue({
            status: 'idle'
        }),
        useShop: vi.fn().mockReturnValue({}),
        useShopifyCookies: vi.fn().mockReturnValue({})
    };
});

describe('components', () => {
    describe('Label', () => {
        it('should render', () => {
            const wrapper = render(<Label>Nordcom Commerce</Label>);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
