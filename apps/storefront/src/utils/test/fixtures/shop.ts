import type { OnlineShop } from '@nordcom/commerce-db';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export function mockShop({ overrides }: { overrides?: DeepPartial<OnlineShop> } = {}): OnlineShop {
    const base = {
        id: 'mock-shop-id',
        domain: 'staging.localhost:3000',
        commerceProvider: {
            type: 'shopify' as const,
            domain: 'mock.shop' as const,
        },
        design: {
            accents: [
                { type: 'primary', color: '#00ff00', foreground: '#000000' },
                { type: 'secondary', color: '#0000ff', foreground: '#ffffff' },
            ],
        },
        i18n: { defaultLocale: 'en-US' },
    } as unknown as OnlineShop;

    if (!overrides) return base;
    return { ...base, ...(overrides as object) } as OnlineShop;
}
