import { getHeader } from '@nordcom/commerce-cms/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockHeader, mockShop } from '@/utils/test/fixtures';
import { __setCmsShadowTransport, type CmsShadowTransport, flushCmsShadows } from './_cms-shadow';
import { HeaderApi } from './header';

vi.mock('@nordcom/commerce-cms/api', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-cms/api')>('@nordcom/commerce-cms/api');
    return { ...actual, getHeader: vi.fn() };
});

/**
 * Installs a capturing shadow transport whose query resolves with the supplied value.
 *
 * @param value - The value every Convex query resolves with.
 * @returns The captured query invocations.
 */
function installTransport(value: unknown): { queries: Array<{ name: string; args: Record<string, unknown> }> } {
    const queries: Array<{ name: string; args: Record<string, unknown> }> = [];
    const transport: CmsShadowTransport = {
        query: (name, args) => {
            queries.push({ name, args });
            return Promise.resolve(value);
        },
        mutation: () => Promise.resolve(null),
    };
    __setCmsShadowTransport(transport);
    return { queries };
}

afterEach(async () => {
    await flushCmsShadows();
    __setCmsShadowTransport(null);
    delete process.env.CMS_READ_FLIP;
    vi.mocked(getHeader).mockReset();
});

describe('HeaderApi — Convex-native default (CUTOVER-04)', () => {
    it('serves the Convex singleton read untouched in the bare default env (SFREAD-01 byte-identity)', async () => {
        const header = mockHeader({ logoLink: '/landing' });
        const { queries } = installTransport(header);

        const result = await HeaderApi({ shop: mockShop(), locale: Locale.from('en-US') });

        // Identity passthrough: the flip path applies no reshaping, so the contract-shaped
        // document the Convex read serves IS the getter result.
        expect(result).toBe(header);
        expect(queries).toEqual([
            {
                name: 'cms/read:singleton',
                args: { shopId: 'mock-shop-id', collection: 'header', locale: 'en-US' },
            },
        ]);
        // The Mongo leg is never consulted on a successful default-flipped read.
        expect(getHeader).not.toHaveBeenCalled();
    });

    it('preserves null-on-missing from the Convex read', async () => {
        installTransport(null);
        const result = await HeaderApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result).toBeNull();
        expect(getHeader).not.toHaveBeenCalled();
    });
});

describe('HeaderApi — emergency-shadow (CMS_READ_FLIP=-header serves the Mongo snapshot)', () => {
    it('maps OnlineShop → ShopRef and calls getHeader', async () => {
        process.env.CMS_READ_FLIP = '-header';
        vi.mocked(getHeader).mockResolvedValue(mockHeader());
        await HeaderApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(getHeader).toHaveBeenCalledWith({
            shop: { id: 'mock-shop-id', domain: 'staging.storefront.localhost', i18n: { defaultLocale: 'en-US' } },
            locale: { code: 'en-US' },
            // Outside a request scope draft detection degrades to the published-only default.
            draft: false,
        });
    });

    it('returns null when CMS doc is missing', async () => {
        process.env.CMS_READ_FLIP = '-header';
        vi.mocked(getHeader).mockResolvedValue(null as never);
        const result = await HeaderApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result).toBeNull();
    });

    it('returns the populated Header doc unchanged on hit', async () => {
        process.env.CMS_READ_FLIP = '-header';
        const header = mockHeader({ logoLink: '/landing' });
        vi.mocked(getHeader).mockResolvedValue(header);
        const result = await HeaderApi({ shop: mockShop(), locale: Locale.from('en-US') });
        // normalizePayloadDoc walks and copies the doc, so the result is structurally
        // identical but not reference-equal to the original.
        expect(result).toStrictEqual(header);
    });
});
