import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/edge-config', () => ({
    get: vi.fn(),
}));

import { get } from '@vercel/edge-config';
import { readFlag } from '@/utils/flags-cache-safe';

describe('utils/flags-cache-safe', () => {
    describe('readFlag', () => {
        const originalEdgeConfig = process.env.EDGE_CONFIG;

        beforeEach(() => {
            process.env.EDGE_CONFIG = 'https://edge-config.vercel.com/test';
            vi.mocked(get).mockReset();
        });

        afterEach(() => {
            if (typeof originalEdgeConfig === 'undefined') {
                delete process.env.EDGE_CONFIG;
            } else {
                process.env.EDGE_CONFIG = originalEdgeConfig;
            }
        });

        it('returns the edge config value when set', async () => {
            vi.mocked(get).mockResolvedValueOnce(true);
            const result = await readFlag('some-flag', false);
            expect(result).toBe(true);
        });

        it('returns the default value when the key is unset (undefined)', async () => {
            vi.mocked(get).mockResolvedValueOnce(undefined);
            const result = await readFlag('some-flag', false);
            expect(result).toBe(false);
        });

        it('returns the default value when edge config throws (e.g. transient failure)', async () => {
            vi.mocked(get).mockRejectedValueOnce(new Error('boom'));
            const result = await readFlag('some-flag', false);
            expect(result).toBe(false);
        });

        it('supports non-boolean defaults', async () => {
            vi.mocked(get).mockRejectedValueOnce(new Error('boom'));
            const result = await readFlag<string>('some-flag', 'fallback');
            expect(result).toBe('fallback');
        });

        it('short-circuits to the default when EDGE_CONFIG env var is unset', async () => {
            delete process.env.EDGE_CONFIG;
            const result = await readFlag('some-flag', false);
            expect(result).toBe(false);
            // get() must not be called at all when the env var is missing
            expect(vi.mocked(get)).not.toHaveBeenCalled();
        });

        it('short-circuits to the default when EDGE_CONFIG env var is empty string', async () => {
            process.env.EDGE_CONFIG = '';
            const result = await readFlag('some-flag', false);
            expect(result).toBe(false);
            expect(vi.mocked(get)).not.toHaveBeenCalled();
        });
    });
});
