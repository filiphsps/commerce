import { getBusinessData } from '@nordcom/commerce-cms/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockBusinessData, mockShop } from '@/utils/test/fixtures';
import { __setCmsShadowTransport, type CmsShadowTransport, flushCmsShadows } from './_cms-shadow';
import { InfoBarApi } from './info-bar';

vi.mock('@nordcom/commerce-cms/api', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-cms/api')>('@nordcom/commerce-cms/api');
    return { ...actual, getBusinessData: vi.fn() };
});

/**
 * Installs a shadow transport whose query resolves with the supplied value, so the
 * default-flipped BusinessData delegate serves Convex without a deployment.
 *
 * @param value - The value every Convex query resolves with.
 */
function installTransport(value: unknown): void {
    const transport: CmsShadowTransport = {
        query: () => Promise.resolve(value),
        mutation: () => Promise.resolve(null),
    };
    __setCmsShadowTransport(transport);
}

afterEach(async () => {
    await flushCmsShadows();
    __setCmsShadowTransport(null);
    delete process.env.CMS_READ_FLIP;
    vi.mocked(getBusinessData).mockReset();
});

describe('InfoBarApi', () => {
    it('delegates to BusinessDataApi (returns the same BusinessDatum from the Convex-native default)', async () => {
        const business = mockBusinessData({ supportEmail: 'hi@x.test' });
        installTransport(business);
        const result = await InfoBarApi({ shop: mockShop(), locale: Locale.from('en-US') });
        // The flipped delegate is an identity passthrough, so the served document IS the result.
        expect(result).toBe(business);
        expect(getBusinessData).not.toHaveBeenCalled();
    });

    it('returns null when BusinessData is missing', async () => {
        installTransport(null);
        expect(await InfoBarApi({ shop: mockShop(), locale: Locale.from('en-US') })).toBeNull();
    });

    it('delegates through the emergency-shadow leg under CMS_READ_FLIP=-businessData', async () => {
        process.env.CMS_READ_FLIP = '-businessData';
        const business = mockBusinessData({ supportEmail: 'hi@x.test' });
        vi.mocked(getBusinessData).mockResolvedValue(business);
        const result = await InfoBarApi({ shop: mockShop(), locale: Locale.from('en-US') });
        // BusinessDataApi runs the doc through normalizePayloadDoc, which clones it.
        expect(result).toStrictEqual(business);
    });
});
