import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

// Faithful stand-in for React's RSC `cache()`: memoizes by Object.is per
// argument (a tree of Maps). This is the exact keying that makes a fresh
// `{ sensitiveData: true }` object literal miss every time — and that primitive
// arguments hit. Outside the react-server condition the real `cache()` is a
// passthrough, so the normalization fix can only be proven against a stand-in.
vi.mock('react', async (importActual) => {
    const actual = (await importActual()) as typeof import('react');
    return {
        ...actual,
        cache: <A extends unknown[], R>(fn: (...args: A) => R) => {
            const root = new Map<unknown, Map<unknown, unknown>>();
            const RESULT = Symbol('result');
            return (...args: A): R => {
                let node: Map<unknown, unknown> = root;
                for (const arg of args) {
                    let next = node.get(arg) as Map<unknown, unknown> | undefined;
                    if (!next) {
                        next = new Map();
                        node.set(arg, next);
                    }
                    node = next;
                }
                if (node.has(RESULT)) return node.get(RESULT) as R;
                const value = fn(...args);
                node.set(RESULT, value);
                return value;
            };
        },
    };
});

const findByDomainMock = vi.fn();
const findAllMock = vi.fn();

vi.mock('@nordcom/commerce-db', () => ({
    Shop: { findByDomain: findByDomainMock, findAll: findAllMock },
}));

describe('_shop-loader — cache key normalization', () => {
    beforeEach(() => {
        vi.resetModules();
        findByDomainMock.mockReset().mockResolvedValue({ id: 's1', domain: 'shop.example.com' });
    });

    it('dedupes repeated lookups that pass fresh { sensitiveData } literals within a render pass', async () => {
        const { Shop } = await import('./_shop-loader');

        // Two DISTINCT object literals with identical values — the real-world
        // pattern (ShopifyApiConfig, metadata builders) that used to miss.
        await Shop.findByDomain('shop.example.com', { sensitiveData: true });
        await Shop.findByDomain('shop.example.com', { sensitiveData: true });

        expect(findByDomainMock).toHaveBeenCalledTimes(1);
        expect(findByDomainMock).toHaveBeenCalledWith('shop.example.com', {
            sensitiveData: true,
            convert: true,
            populate: [],
        });
    });

    it('treats a bare lookup and { sensitiveData: true } as distinct cache entries', async () => {
        const { Shop } = await import('./_shop-loader');

        await Shop.findByDomain('shop.example.com');
        await Shop.findByDomain('shop.example.com', { sensitiveData: true });

        // Different sensitivity → different data → must not collapse.
        expect(findByDomainMock).toHaveBeenCalledTimes(2);
    });

    it('keys distinct populate paths separately', async () => {
        const { Shop } = await import('./_shop-loader');

        await Shop.findByDomain('shop.example.com', { populate: ['featureFlags.flag'] });
        await Shop.findByDomain('shop.example.com', { populate: ['featureFlags.flag'] });
        await Shop.findByDomain('shop.example.com', { populate: ['collaborators.user'] });

        expect(findByDomainMock).toHaveBeenCalledTimes(2);
    });
});
