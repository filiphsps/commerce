import { getFooter } from '@nordcom/commerce-cms/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockFooter, mockShop } from '@/utils/test/fixtures';
import { __setCmsShadowTransport, type CmsShadowTransport, flushCmsShadows } from './_cms-shadow';
import { FooterApi } from './footer';

vi.mock('@nordcom/commerce-cms/api', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-cms/api')>('@nordcom/commerce-cms/api');
    return { ...actual, getFooter: vi.fn() };
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
    vi.mocked(getFooter).mockReset();
});

describe('FooterApi — Convex-native default (CUTOVER-06)', () => {
    it('serves the Convex singleton read untouched in the bare default env (SFREAD-01 byte-identity)', async () => {
        const footer = mockFooter();
        const { queries } = installTransport(footer);

        const result = await FooterApi({ shop: mockShop(), locale: Locale.from('en-US') });

        // Identity passthrough: the flip path applies no reshaping, so the contract-shaped
        // document the Convex read serves IS the getter result.
        expect(result).toBe(footer);
        expect(queries).toEqual([
            {
                name: 'cms/read:singleton',
                args: { shopId: 'mock-shop-id', collection: 'footer', locale: 'en-US' },
            },
        ]);
        // The Mongo leg is never consulted on a successful default-flipped read.
        expect(getFooter).not.toHaveBeenCalled();
    });

    it('preserves null-on-missing from the Convex read', async () => {
        installTransport(null);
        const result = await FooterApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result).toBeNull();
        expect(getFooter).not.toHaveBeenCalled();
    });
});

describe('FooterApi — emergency-shadow (CMS_READ_FLIP=-footer serves the Mongo snapshot)', () => {
    it('maps OnlineShop → ShopRef and forwards', async () => {
        process.env.CMS_READ_FLIP = '-footer';
        vi.mocked(getFooter).mockResolvedValue(mockFooter());
        await FooterApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(getFooter).toHaveBeenCalledWith({
            shop: { id: 'mock-shop-id', domain: 'staging.storefront.localhost', i18n: { defaultLocale: 'en-US' } },
            locale: { code: 'en-US' },
            // Outside a request scope draft detection degrades to the published-only default.
            draft: false,
        });
    });

    it('returns null when CMS doc is missing', async () => {
        process.env.CMS_READ_FLIP = '-footer';
        vi.mocked(getFooter).mockResolvedValue(null as never);
        expect(await FooterApi({ shop: mockShop(), locale: Locale.from('en-US') })).toBeNull();
    });
});
