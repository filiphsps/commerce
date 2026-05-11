import type { OnlineShop } from '@nordcom/commerce-db';
import { NotFoundError } from '@nordcom/commerce-errors';
import { describe, expect, it, vi } from 'vitest';
import { FooterApi } from '@/api/footer';
import { Locale } from '@/utils/locale';

vi.mock('@/utils/prismic', () => ({
    createClient: vi.fn(),
    buildPrismicCacheTags: vi.fn().mockReturnValue([]),
}));

const makeShopifyShop = (): OnlineShop =>
    ({
        id: 'shop-1',
        domain: 'shop.example.com',
        contentProvider: { type: 'shopify' },
    }) as unknown as OnlineShop;

const makePrismicShop = (defaultLocale = 'en-US'): OnlineShop =>
    ({
        id: 'prismic-shop-1',
        domain: 'prismic.example.com',
        contentProvider: { type: 'prismic', repository: 'my-repo' },
        i18n: { defaultLocale },
    }) as unknown as OnlineShop;

describe('api/footer', () => {
    describe('FooterApi', () => {
        it('returns null for non-prismic shops', async () => {
            const shop = makeShopifyShop();
            const result = await FooterApi({ shop, locale: Locale.default as unknown as Locale });
            expect(result).toBeNull();
        });

        it('recursion guard: stops after at most 2 calls when getSingle always throws NotFoundError', async () => {
            // The recursion guard (fallback.code !== _locale.code) prevents infinite recursion:
            // it allows exactly one retry with the shop's default locale then rethrows.
            // We make createClient echo back the requested locale so _locale always matches the
            // locale passed to the call, ensuring the guard terminates on the second call.
            const getSingleMock = vi.fn().mockRejectedValue(new NotFoundError('footer not found'));
            const { createClient } = await import('@/utils/prismic');
            vi.mocked(createClient).mockImplementation(({ locale: requestedLocale }: any) => ({
                getSingle: getSingleMock,
                defaultParams: { lang: requestedLocale.code },
            })) as any;

            const shop = makePrismicShop('en-US');
            // Request with a non-default locale so a fallback attempt can occur.
            const locale = Locale.from('fr-FR') as Locale;

            // The function must not recurse infinitely; it throws after the fallback attempt.
            await expect(FooterApi({ shop, locale })).rejects.toMatchObject({
                name: NotFoundError.name,
            });

            // At most 2 getSingle calls: one for fr-FR, one for en-US fallback.
            expect(getSingleMock.mock.calls.length).toBeLessThanOrEqual(2);
        });
    });
});
