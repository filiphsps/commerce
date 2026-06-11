import { afterEach, describe, expect, it } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockBusinessData, mockShop } from '@/utils/test/fixtures';
import { __setCmsReadQuery } from './_cms-read';
import { InfoBarApi } from './info-bar';

/**
 * Installs a read transport whose query resolves with the supplied value, so the
 * BusinessData delegate serves Convex without a deployment.
 *
 * @param value - The value every Convex query resolves with.
 */
function installQuery(value: unknown): void {
    __setCmsReadQuery(() => Promise.resolve(value));
}

afterEach(() => {
    __setCmsReadQuery(null);
});

describe('InfoBarApi', () => {
    it('delegates to BusinessDataApi (returns the same BusinessDatum from the Convex read)', async () => {
        const business = mockBusinessData({ supportEmail: 'hi@x.test' });
        installQuery(business);
        const result = await InfoBarApi({ shop: mockShop(), locale: Locale.from('en-US') });
        // The delegate is an identity passthrough, so the served document IS the result.
        expect(result).toBe(business);
    });

    it('returns null when BusinessData is missing', async () => {
        installQuery(null);
        expect(await InfoBarApi({ shop: mockShop(), locale: Locale.from('en-US') })).toBeNull();
    });
});
