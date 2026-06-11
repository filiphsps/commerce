import { afterEach, describe, expect, it } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockFooter, mockShop } from '@/utils/test/fixtures';
import { __setCmsReadQuery } from './_cms-read';
import { FooterApi } from './footer';

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

describe('FooterApi — Convex-native (TEARDOWN-02 straight-line)', () => {
    it('serves the Convex singleton read untouched (SFREAD-01 byte-identity)', async () => {
        const footer = mockFooter();
        const { queries } = installQuery(footer);

        const result = await FooterApi({ shop: mockShop(), locale: Locale.from('en-US') });

        expect(result).toBe(footer);
        expect(queries).toEqual([
            {
                name: 'cms/read:singleton',
                args: { shopId: 'mock-shop-id', collection: 'footer', locale: 'en-US' },
            },
        ]);
    });

    it('preserves null-on-missing from the Convex read', async () => {
        installQuery(null);
        const result = await FooterApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result).toBeNull();
    });
});
