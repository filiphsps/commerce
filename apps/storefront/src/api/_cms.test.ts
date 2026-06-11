import type { Media } from '@nordcom/commerce-cms/types';
import { describe, expect, it } from 'vitest';
import { populatedMedia, tenantId } from './_cms';

describe('_cms utilities', () => {
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
