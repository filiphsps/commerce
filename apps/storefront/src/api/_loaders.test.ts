import { describe, expect, it, vi } from 'vitest';

const findByDomainMock = vi.fn();
const findAllMock = vi.fn();

vi.mock('@nordcom/commerce-db', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-db')>('@nordcom/commerce-db');
    return {
        ...actual,
        Shop: {
            ...actual.Shop,
            findByDomain: findByDomainMock,
            findAll: findAllMock,
        },
    };
});

describe('Shop loader', () => {
    it('wraps findByDomain with React cache() and delegates to the underlying implementation', async () => {
        const { Shop } = await import('./_loaders');
        findByDomainMock.mockClear();
        findByDomainMock.mockResolvedValue({ id: 'shop-1', domain: 'shop-1.com' } as any);

        // React cache() returns a new wrapper function (not the raw mock).
        expect(Shop.findByDomain).not.toBe(findByDomainMock);

        const result = await Shop.findByDomain('shop-1.com');

        expect(result).toEqual({ id: 'shop-1', domain: 'shop-1.com' });
        expect(findByDomainMock).toHaveBeenCalledWith('shop-1.com');
    });

    it('exposes findAll passthrough', async () => {
        const { Shop } = await import('./_loaders');
        findAllMock.mockClear();
        findAllMock.mockResolvedValue([{ id: 'shop-1', domain: 'shop-1.com' }] as any);

        const result = await Shop.findAll();

        expect(result).toHaveLength(1);
        expect(findAllMock).toHaveBeenCalled();
    });
});
