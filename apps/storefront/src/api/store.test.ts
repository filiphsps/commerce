import { getBusinessData } from '@nordcom/commerce-cms/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockBusinessData, mockShop } from '@/utils/test/fixtures';
import { __setCmsShadowTransport, type CmsShadowTransport, flushCmsShadows } from './_cms-shadow';
import { BusinessDataApi } from './store';

vi.mock('@nordcom/commerce-cms/api', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-cms/api')>('@nordcom/commerce-cms/api');
    return { ...actual, getBusinessData: vi.fn() };
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
    vi.mocked(getBusinessData).mockReset();
});

describe('BusinessDataApi — Convex-native default (CUTOVER-06)', () => {
    it('serves the Convex singleton read untouched in the bare default env (SFREAD-01 byte-identity)', async () => {
        const business = mockBusinessData();
        const { queries } = installTransport(business);

        const result = await BusinessDataApi({ shop: mockShop(), locale: Locale.from('en-US') });

        // Identity passthrough: the flip path applies no reshaping, so the contract-shaped
        // document the Convex read serves IS the getter result.
        expect(result).toBe(business);
        expect(queries).toEqual([
            {
                name: 'cms/read:singleton',
                args: { shopId: 'mock-shop-id', collection: 'businessData', locale: 'en-US' },
            },
        ]);
        // The Mongo leg is never consulted on a successful default-flipped read.
        expect(getBusinessData).not.toHaveBeenCalled();
    });

    it('preserves null-on-missing from the Convex read', async () => {
        installTransport(null);
        const result = await BusinessDataApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result).toBeNull();
        expect(getBusinessData).not.toHaveBeenCalled();
    });
});

describe('BusinessDataApi — emergency-shadow (CMS_READ_FLIP=-businessData serves the Mongo snapshot)', () => {
    it('calls getBusinessData with mapped shop + locale', async () => {
        process.env.CMS_READ_FLIP = '-businessData';
        vi.mocked(getBusinessData).mockResolvedValue(mockBusinessData());
        await BusinessDataApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(getBusinessData).toHaveBeenCalledWith({
            shop: { id: 'mock-shop-id', domain: 'staging.storefront.localhost', i18n: { defaultLocale: 'en-US' } },
            locale: { code: 'en-US' },
        });
    });

    it('returns null when CMS doc is missing', async () => {
        process.env.CMS_READ_FLIP = '-businessData';
        vi.mocked(getBusinessData).mockResolvedValue(null as never);
        expect(await BusinessDataApi({ shop: mockShop(), locale: Locale.from('en-US') })).toBeNull();
    });
});
