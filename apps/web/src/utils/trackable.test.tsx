import { render } from '@/utils/test/react';
import { Trackable } from '@/utils/trackable';
import { describe, expect, it, vi } from 'vitest';

describe('components', () => {
    describe('Trackable', () => {
        vi.mock('@shopify/hydrogen-react', async () => {
            return {
                useCart: vi.fn().mockReturnValue({
                    status: 'idle'
                }),
                useShop: vi.fn().mockReturnValue({})
            };
        });

        it('should render children', () => {
            render(
                <Trackable>
                    <div>Test Content</div>
                </Trackable>
            );

            expect(document.querySelector('div')).not.toBeNull();
            expect(document.querySelector('div')?.textContent).toBe('Test Content');
        });
    });
});
