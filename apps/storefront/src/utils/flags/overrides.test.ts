import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('flags', () => ({
    decryptOverrides: vi.fn(),
}));

vi.mock('next/headers', () => ({
    cookies: vi.fn(),
}));

import { decryptOverrides } from 'flags';
import { cookies } from 'next/headers';
import { getFlagOverrides } from './overrides';

const mockCookies = (value: string | null) => ({
    get: vi.fn((name: string) => (name === 'vercel-flag-overrides' && value !== null ? { value } : undefined)),
});

describe('utils/flags/overrides', () => {
    const originalSecret = process.env.FLAGS_SECRET;

    beforeEach(() => {
        process.env.FLAGS_SECRET = 'test-secret';
        vi.mocked(cookies).mockResolvedValue(mockCookies(null) as never);
        vi.mocked(decryptOverrides).mockReset();
    });

    afterEach(() => {
        if (originalSecret === undefined) delete process.env.FLAGS_SECRET;
        else process.env.FLAGS_SECRET = originalSecret;
    });

    it('returns null when FLAGS_SECRET is unset', async () => {
        delete process.env.FLAGS_SECRET;
        const result = await getFlagOverrides();
        expect(result).toBeNull();
    });

    it('returns null when the override cookie is absent', async () => {
        const result = await getFlagOverrides();
        expect(result).toBeNull();
    });

    it('returns null when decryption throws', async () => {
        vi.mocked(cookies).mockResolvedValue(mockCookies('bad-cookie') as never);
        vi.mocked(decryptOverrides).mockRejectedValueOnce(new Error('decrypt failed'));
        const result = await getFlagOverrides();
        expect(result).toBeNull();
    });

    it('returns the decoded overrides record on success', async () => {
        vi.mocked(cookies).mockResolvedValue(mockCookies('good-cookie') as never);
        vi.mocked(decryptOverrides).mockResolvedValueOnce({ 'flag-x': true });
        const result = await getFlagOverrides();
        expect(result).toEqual({ 'flag-x': true });
    });
});
