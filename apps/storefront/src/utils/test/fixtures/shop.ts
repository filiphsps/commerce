import type { OnlineShop } from '@nordcom/commerce-db';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/**
 * Builds a minimal `OnlineShop` fixture for use in tests, with optional deep-partial overrides.
 *
 * @param options.overrides - Deep-partial overrides merged onto the base fixture.
 * @returns A mock `OnlineShop` with sensible defaults for a Shopify commerce provider.
 */
export function mockShop({ overrides }: { overrides?: DeepPartial<OnlineShop> } = {}): OnlineShop {
    const base = {
        id: 'mock-shop-id',
        domain: 'staging.storefront.localhost',
        commerceProvider: {
            type: 'shopify' as const,
            domain: 'mock.shop' as const,
        },
        design: {
            header: {
                logo: { src: '', alt: 'Mock logo', width: 125, height: 50 },
            },
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
