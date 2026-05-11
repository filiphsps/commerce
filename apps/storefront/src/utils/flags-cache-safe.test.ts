import { describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/edge-config', () => ({
    get: vi.fn(),
}));

import { get } from '@vercel/edge-config';
import { readFlag } from '@/utils/flags-cache-safe';

describe('utils/flags-cache-safe', () => {
    describe('readFlag', () => {
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

        it('returns the default value when edge config throws (e.g. no EDGE_CONFIG env)', async () => {
            vi.mocked(get).mockRejectedValueOnce(new Error('@vercel/edge-config: No connection string provided'));
            const result = await readFlag('some-flag', false);
            expect(result).toBe(false);
        });

        it('supports non-boolean defaults', async () => {
            vi.mocked(get).mockRejectedValueOnce(new Error('boom'));
            const result = await readFlag<string>('some-flag', 'fallback');
            expect(result).toBe('fallback');
        });
    });
});
