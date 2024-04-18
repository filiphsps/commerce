import { describe, expect, it, vi } from 'vitest';

import React from 'react';

import { render } from '@/utils/test/react';

import SplitView from '@/components/layout/split-view';

describe('components', () => {
    describe('SplitView', () => {
        vi.mock('@shopify/hydrogen-react', async () => {
            return {
                useCart: vi.fn().mockReturnValue({
                    status: 'idle'
                }),
                useShop: vi.fn().mockReturnValue({}),
                useShopifyCookies: vi.fn().mockReturnValue({})
            };
        });

        it('renders aside and primary content', async () => {
            const asideContent = 'This is the aside content';
            const primaryContent = 'This is the primary content';

            const { getByText } = render(
                <SplitView aside={<div>{asideContent}</div>}>
                    <div>{primaryContent}</div>
                </SplitView>
            );

            expect(getByText(asideContent)).toBeDefined();
            expect(getByText(primaryContent)).toBeDefined();
        });
    });
});