import { Label } from '@/components/typography/label';
import { render } from '@/utils/test/react';
import { describe, expect, it, vi } from 'vitest';

describe('components', () => {
    describe('Label', () => {
        vi.mock('@shopify/hydrogen-react', async () => {
            return {
                useCart: vi.fn().mockReturnValue({
                    status: 'idle'
                }),
                useShop: vi.fn().mockReturnValue({})
            };
        });

        it('should render', () => {
            const wrapper = render(<Label>Nordcom Commerce</Label>);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
