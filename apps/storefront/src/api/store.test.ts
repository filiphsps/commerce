import { afterEach, describe, expect, it } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockBusinessData, mockShop } from '@/utils/test/fixtures';
import { __setCmsReadQuery } from './_cms-read';
import { BusinessDataApi } from './store';

/**
 * Installs a capturing read transport whose query resolves with the supplied value.
 *
 * @param value - The value every Convex query resolves with.
 * @returns The captured query invocations.
 */
function installQuery(value: unknown): { queries: Array<{ name: string; args: Record<string, unknown> }> } {
    const queries: Array<{ name: string; args: Record<string, unknown> }> = [];
    __setCmsReadQuery((name, args) => {
        queries.push({ name, args });
        return Promise.resolve(value);
    });
    return { queries };
}

afterEach(() => {
    __setCmsReadQuery(null);
});

describe('BusinessDataApi — Convex-native (TEARDOWN-02 straight-line)', () => {
    it('serves the Convex singleton read untouched (SFREAD-01 byte-identity)', async () => {
        const business = mockBusinessData();
        const { queries } = installQuery(business);

        const result = await BusinessDataApi({ shop: mockShop(), locale: Locale.from('en-US') });

        // Identity passthrough: the getter applies no reshaping, so the contract-shaped
        // document the Convex read serves IS the getter result.
        expect(result).toBe(business);
        expect(queries).toEqual([
            {
                name: 'cms/read:singleton',
                args: { shopId: 'mock-shop-id', collection: 'businessData', locale: 'en-US' },
            },
        ]);
    });

    it('preserves null-on-missing from the Convex read', async () => {
        installQuery(null);
        const result = await BusinessDataApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result).toBeNull();
    });
});
