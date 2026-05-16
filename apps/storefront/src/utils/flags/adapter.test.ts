import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
    headers: vi.fn(),
    cookies: vi.fn(),
}));

vi.mock('flags/next', () => ({
    dedupe: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

vi.mock('@/utils/request-context', () => ({
    getRequestContext: vi.fn(),
}));
vi.mock('@/auth', () => ({
    getAuthSession: vi.fn(),
}));

import { getAuthSession } from '@/auth';
import { getRequestContext } from '@/utils/request-context';
import { nordcomFlagAdapter } from './adapter';
import { __resetPredicatesForTest } from './predicates';
import { registerBuiltinPredicates } from './register-builtin-predicates';

const mockShop = (featureFlags: unknown[] = []) =>
    ({
        id: 'shop-1',
        domain: 'shop.example.com',
        featureFlags,
    }) as never;

const mockHeaders = (h: Record<string, string> = {}) => ({
    get: (n: string) => h[n.toLowerCase()] ?? null,
});

const mockCookies = (c: Record<string, string> = {}) => ({
    get: (n: string) => (c[n] !== undefined ? { value: c[n] } : undefined),
});

describe('utils/flags/adapter.nordcomFlagAdapter', () => {
    beforeEach(() => {
        __resetPredicatesForTest();
        registerBuiltinPredicates();
        vi.mocked(getRequestContext).mockReset();
        vi.mocked(getAuthSession).mockReset();
        vi.mocked(getRequestContext).mockResolvedValue({ shop: mockShop(), locale: {} as never });
        vi.mocked(getAuthSession).mockResolvedValue(null);
    });

    afterEach(() => {
        __resetPredicatesForTest();
    });

    it('decides via shop.featureFlags targeting', async () => {
        const adapter = nordcomFlagAdapter<boolean>();
        vi.mocked(getRequestContext).mockResolvedValue({
            shop: mockShop([
                {
                    flag: {
                        key: 'feat-a',
                        defaultValue: false,
                        targeting: [{ rule: 'shop', params: { shopIds: ['shop-1'] }, value: true }],
                    },
                },
            ]) as never,
            locale: {} as never,
        });

        const entities = await adapter.identify!({
            headers: mockHeaders() as never,
            cookies: mockCookies() as never,
        });

        const v = await adapter.decide({
            key: 'feat-a',
            entities: entities as never,
            headers: mockHeaders() as never,
            cookies: mockCookies() as never,
        });
        expect(v).toBe(true);
    });

    it('returns defaultValue when shop has no matching flag ref', async () => {
        const adapter = nordcomFlagAdapter<boolean>();
        const entities = await adapter.identify!({
            headers: mockHeaders() as never,
            cookies: mockCookies() as never,
        });

        const v = await adapter.decide({
            key: 'no-such-flag',
            entities: entities as never,
            headers: mockHeaders() as never,
            cookies: mockCookies() as never,
            defaultValue: false,
        });
        expect(v).toBe(false);
    });

    it('identify reads visitorId from cookie when present', async () => {
        const adapter = nordcomFlagAdapter<boolean>();
        const ents = await adapter.identify!({
            headers: mockHeaders() as never,
            cookies: mockCookies({ 'nordcom-visitor-id': 'visitor-42' }) as never,
        });
        expect((ents as { visitorId: string }).visitorId).toBe('visitor-42');
    });

    it('identify falls back to x-nordcom-visitor-id header', async () => {
        const adapter = nordcomFlagAdapter<boolean>();
        const ents = await adapter.identify!({
            headers: mockHeaders({ 'x-nordcom-visitor-id': 'visitor-h' }) as never,
            cookies: mockCookies() as never,
        });
        expect((ents as { visitorId: string }).visitorId).toBe('visitor-h');
    });

    it('identify generates a UUID when no cookie or header is present', async () => {
        const adapter = nordcomFlagAdapter<boolean>();
        const ents = await adapter.identify!({
            headers: mockHeaders() as never,
            cookies: mockCookies() as never,
        });
        expect((ents as { visitorId: string }).visitorId).toMatch(/^[0-9a-f-]{36}$/);
    });
});
