import type { Media } from '@nordcom/commerce-cms/types';
import { describe, expect, it } from 'vitest';
import { mockShop } from '@/utils/test/fixtures/shop';
import { populatedMedia, tenantId, toShopRef } from './_cms';

describe('_cms utilities', () => {
    describe('toShopRef', () => {
        it('maps OnlineShop fields to ShopRef', () => {
            const shop = mockShop({ overrides: { id: 'abc', domain: 'd.test', i18n: { defaultLocale: 'sv' } } });
            expect(toShopRef(shop)).toEqual({ id: 'abc', domain: 'd.test', i18n: { defaultLocale: 'sv' } });
        });

        it("defaults defaultLocale to 'en-US' when shop.i18n is missing", () => {
            const shop = mockShop({ overrides: { i18n: undefined as any } });
            expect(toShopRef(shop).i18n.defaultLocale).toBe('en-US');
        });
    });

    describe('populatedMedia', () => {
        const media: Media = {
            id: 'm1',
            url: 'https://x.test/a.png',
            alt: 'A',
            updatedAt: '',
            createdAt: '',
        } as Media;

        it('returns Media unchanged when fully populated', () => {
            expect(populatedMedia(media)).toBe(media);
        });

        it('returns null for string ids (unpopulated)', () => {
            expect(populatedMedia('media-id')).toBeNull();
        });

        it('returns null for null', () => {
            expect(populatedMedia(null)).toBeNull();
        });

        it('returns null for undefined', () => {
            expect(populatedMedia(undefined)).toBeNull();
        });
    });

    describe('tenantId', () => {
        it('returns the id from a populated Tenant', () => {
            const t = { id: 'tnt-1' };
            expect(tenantId(t)).toBe('tnt-1');
        });

        it('returns the value when given a string id', () => {
            expect(tenantId('tnt-2')).toBe('tnt-2');
        });

        it('returns null for null/undefined', () => {
            expect(tenantId(null)).toBeNull();
            expect(tenantId(undefined)).toBeNull();
        });
    });
});
