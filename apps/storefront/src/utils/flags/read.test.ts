import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./overrides', () => ({
    getFlagOverrides: vi.fn(),
}));

vi.mock('./evaluate', () => ({
    evaluateShopFlag: vi.fn(),
}));

import { evaluateShopFlag } from './evaluate';
import { getFlagOverrides } from './overrides';
import { readFlag } from './read';

const shop = { id: 'shop-1' } as never;

describe('utils/flags/read.readFlag', () => {
    beforeEach(() => {
        vi.mocked(getFlagOverrides).mockReset();
        vi.mocked(evaluateShopFlag).mockReset();
    });

    it('threads getFlagOverrides() result into evaluateShopFlag.overrides', async () => {
        vi.mocked(getFlagOverrides).mockResolvedValue({ 'flag-x': true });
        vi.mocked(evaluateShopFlag).mockReturnValue(true as never);

        const result = await readFlag<boolean>(shop, 'flag-x', { codeDefaultValue: false });

        expect(getFlagOverrides).toHaveBeenCalledTimes(1);
        expect(evaluateShopFlag).toHaveBeenCalledWith(shop, 'flag-x', {
            codeDefaultValue: false,
            overrides: { 'flag-x': true },
        });
        expect(result).toBe(true);
    });

    it('passes overrides: null when getFlagOverrides returns null', async () => {
        vi.mocked(getFlagOverrides).mockResolvedValue(null);
        vi.mocked(evaluateShopFlag).mockReturnValue(false as never);

        await readFlag<boolean>(shop, 'flag-x', { codeDefaultValue: false });

        expect(evaluateShopFlag).toHaveBeenCalledWith(shop, 'flag-x', {
            codeDefaultValue: false,
            overrides: null,
        });
    });

    it('returns whatever evaluateShopFlag returns (pass-through)', async () => {
        vi.mocked(getFlagOverrides).mockResolvedValue(null);
        vi.mocked(evaluateShopFlag).mockReturnValue('arbitrary' as never);

        const result = await readFlag<string>(shop, 'flag-x', { codeDefaultValue: 'default' });
        expect(result).toBe('arbitrary');
    });

    it('works with the default empty options object', async () => {
        vi.mocked(getFlagOverrides).mockResolvedValue(null);
        vi.mocked(evaluateShopFlag).mockReturnValue(false as never);

        await readFlag<boolean>(shop, 'flag-x');

        expect(evaluateShopFlag).toHaveBeenCalledWith(shop, 'flag-x', { overrides: null });
    });
});
