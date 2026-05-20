import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/flags/definitions/product-info-lines', () => ({
    productInfoLines: { evaluate: vi.fn() },
}));
vi.mock('next/headers', () => ({
    headers: vi.fn(() => {
        throw new Error('headers() called inside cached component');
    }),
}));

import { InfoLines } from '@/components/products/info-lines';
import { productInfoLines } from '@/utils/flags/definitions/product-info-lines';

describe('components/products/info-lines', () => {
    it('returns null and does not read request headers when flag is false', async () => {
        vi.mocked(productInfoLines.evaluate).mockReturnValue(false as never);
        const ui = await InfoLines({
            shop: { id: 's-1' } as never,
            product: { availableForSale: true, totalInventory: 10 } as never,
            i18n: {} as never,
            locale: { code: 'en-US' } as never,
        } as never);
        expect(ui).toBeNull();
        expect(productInfoLines.evaluate).toHaveBeenCalledWith({ id: 's-1' });
    });
});
