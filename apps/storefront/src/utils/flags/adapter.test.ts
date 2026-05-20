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

vi.mock('./overrides', () => ({
    getFlagOverrides: vi.fn(),
}));

import { getAuthSession } from '@/auth';
import { getRequestContext } from '@/utils/request-context';
import { nordcomFlagAdapter } from './adapter';
import { getFlagOverrides } from './overrides';
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

describe('utils/flags/adapter.nordcomFlagAdapter — overrides', () => {
    beforeEach(() => {
        __resetPredicatesForTest();
        registerBuiltinPredicates();
        vi.mocked(getRequestContext).mockReset();
        vi.mocked(getAuthSession).mockReset();
        vi.mocked(getFlagOverrides).mockReset();
        vi.mocked(getRequestContext).mockResolvedValue({ shop: mockShop(), locale: {} as never });
        vi.mocked(getAuthSession).mockResolvedValue(null);
    });

    afterEach(() => {
        __resetPredicatesForTest();
    });

    const callDecide = async <T>(flagKey: string, shopFlags: unknown[], defaultValue: T): Promise<T> => {
        const adapter = nordcomFlagAdapter<T>();
        const entities = await adapter.identify!({
            headers: mockHeaders() as never,
            cookies: mockCookies() as never,
        });
        return adapter.decide({
            key: flagKey,
            entities: { ...(entities as object), shop: mockShop(shopFlags) } as never,
            defaultValue,
            cookies: mockCookies() as never,
            headers: mockHeaders() as never,
        });
    };

    it('returns the override value when the key is present in overrides', async () => {
        vi.mocked(getFlagOverrides).mockResolvedValue({ 'flag-x': true });
        const result = await callDecide<boolean>(
            'flag-x',
            [
                {
                    flag: {
                        key: 'flag-x',
                        defaultValue: false,
                        targeting: [{ rule: 'always', params: {}, value: false }],
                    },
                },
            ],
            false,
        );
        expect(result).toBe(true);
    });

    it('honors an explicit undefined override (Object.hasOwn semantics)', async () => {
        vi.mocked(getFlagOverrides).mockResolvedValue({ 'flag-x': undefined });
        const result = await callDecide<boolean | undefined>(
            'flag-x',
            [
                {
                    flag: {
                        key: 'flag-x',
                        defaultValue: false,
                        targeting: [{ rule: 'always', params: {}, value: true }],
                    },
                },
            ],
            false,
        );
        expect(result).toBeUndefined();
    });

    it('falls through to targeting when getFlagOverrides returns null', async () => {
        vi.mocked(getFlagOverrides).mockResolvedValue(null);
        const result = await callDecide<boolean>(
            'flag-x',
            [
                {
                    flag: {
                        key: 'flag-x',
                        defaultValue: false,
                        targeting: [{ rule: 'always', params: {}, value: true }],
                    },
                },
            ],
            false,
        );
        expect(result).toBe(true);
    });

    it('falls through to targeting when key is absent from overrides', async () => {
        vi.mocked(getFlagOverrides).mockResolvedValue({ 'other-flag': true });
        const result = await callDecide<boolean>(
            'flag-x',
            [
                {
                    flag: {
                        key: 'flag-x',
                        defaultValue: false,
                        targeting: [{ rule: 'always', params: {}, value: true }],
                    },
                },
            ],
            false,
        );
        expect(result).toBe(true);
    });
});
