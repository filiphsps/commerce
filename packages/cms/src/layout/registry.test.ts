import { describe, expect, it } from 'vitest';
import { CHROME_SLOT_IDS, type ChromeSlotId, resolveChromeLayout } from './registry';

describe('resolveChromeLayout', () => {
    it('defaults to the historical hardcoded chrome order (byte-identical)', () => {
        expect(resolveChromeLayout()).toEqual(['info-bar', 'header', 'content', 'footer']);
        expect(resolveChromeLayout()).toEqual([...CHROME_SLOT_IDS]);
    });

    it('returns the surface default verbatim for a nullish or empty override', () => {
        expect(resolveChromeLayout({ order: undefined })).toEqual([...CHROME_SLOT_IDS]);
        expect(resolveChromeLayout({ order: null })).toEqual([...CHROME_SLOT_IDS]);
        expect(resolveChromeLayout({ order: [] })).toEqual([...CHROME_SLOT_IDS]);
    });

    it('reorders to a valid override order', () => {
        expect(resolveChromeLayout({ order: ['footer', 'content', 'header', 'info-bar'] })).toEqual([
            'footer',
            'content',
            'header',
            'info-bar',
        ]);
    });

    it('drops a non-required slot omitted from the override order', () => {
        expect(resolveChromeLayout({ order: ['header', 'content', 'footer'] })).toEqual([
            'header',
            'content',
            'footer',
        ]);
    });

    it('hides a non-required slot the visibility predicate rejects', () => {
        const hidden: ChromeSlotId = 'header';
        expect(resolveChromeLayout({ isVisible: (id) => id !== hidden })).toEqual(['info-bar', 'content', 'footer']);
    });

    it('always renders the required content slot, even when the predicate rejects everything', () => {
        expect(resolveChromeLayout({ isVisible: () => false })).toEqual(['content']);
    });

    it('combines override order with visibility', () => {
        expect(
            resolveChromeLayout({
                order: ['footer', 'content', 'header', 'info-bar'],
                isVisible: (id) => id !== 'footer',
            }),
        ).toEqual(['content', 'header', 'info-bar']);
    });

    it('throws a commerce TypeError for an unknown slot id', () => {
        expect(() => resolveChromeLayout({ order: ['header', 'content', 'ghost'] })).toThrow(
            expect.objectContaining({ name: 'TypeError', code: 'INVALID_TYPE' }),
        );
    });

    it('throws a commerce TypeError for a duplicated slot id', () => {
        expect(() => resolveChromeLayout({ order: ['content', 'header', 'header'] })).toThrow(
            expect.objectContaining({ name: 'TypeError', code: 'INVALID_TYPE' }),
        );
    });

    it('throws a commerce TypeError when the required content slot is omitted', () => {
        expect(() => resolveChromeLayout({ order: ['info-bar', 'header', 'footer'] })).toThrow(
            expect.objectContaining({ name: 'TypeError', code: 'INVALID_TYPE' }),
        );
    });
});
