import { resolveTheme, type ThemeResolutionInput } from '@nordcom/commerce-db/lib/theme';
import { describe, expect, it } from 'vitest';
import { BLOCK_TYPES, isBlockType } from '../blocks/registry';
import { CHROME_SLOT_IDS, resolveChromeLayout } from '../layout/registry';
import type { ShopExtensionManifest } from './manifest';
import { resolveExtensions } from './resolve';

const bareShop: ThemeResolutionInput = {};
const brandedShop: ThemeResolutionInput = {
    design: { accents: [{ type: 'primary', color: '#073b4c', foreground: '#ffffff' }] },
};

describe('resolveExtensions', () => {
    describe('empty / absent manifest (byte-identical default)', () => {
        it('resolves theme exactly as resolveTheme for a bare shop', () => {
            expect(resolveExtensions({ shop: bareShop }).theme).toEqual(resolveTheme(bareShop));
        });

        it('resolves theme exactly as resolveTheme for a branded shop (accent fallback preserved)', () => {
            expect(resolveExtensions({ shop: brandedShop }).theme).toEqual(resolveTheme(brandedShop));
        });

        it('treats an empty manifest object identically to an absent manifest', () => {
            const empty: ShopExtensionManifest = {};
            expect(resolveExtensions({ shop: brandedShop, manifest: empty }).theme).toEqual(resolveTheme(brandedShop));
            expect(resolveExtensions({ shop: brandedShop, manifest: empty }).chrome).toEqual([...CHROME_SLOT_IDS]);
        });

        it('resolves chrome to the historical default order', () => {
            expect(resolveExtensions({ shop: bareShop }).chrome).toEqual([...CHROME_SLOT_IDS]);
            expect(resolveExtensions({ shop: bareShop }).chrome).toEqual(resolveChromeLayout());
        });

        it('treats every section as visible', () => {
            const { isSectionEnabled } = resolveExtensions({ shop: bareShop });
            for (const id of CHROME_SLOT_IDS) {
                expect(isSectionEnabled(id)).toBe(true);
            }
            expect(isSectionEnabled('hero')).toBe(true);
        });

        it('exposes every block type, with availability equal to isBlockType', () => {
            const { blocks } = resolveExtensions({ shop: bareShop });
            expect(blocks.available).toEqual([...BLOCK_TYPES]);
            for (const type of BLOCK_TYPES) {
                expect(blocks.isAvailable(type)).toBe(true);
            }
            expect(blocks.isAvailable('does-not-exist')).toBe(isBlockType('does-not-exist'));
            expect(blocks.isAvailable('does-not-exist')).toBe(false);
        });

        it('resolves no product-card variant overrides', () => {
            expect(resolveExtensions({ shop: bareShop }).productCard).toEqual({});
        });

        it('resolves no block default overrides', () => {
            expect(resolveExtensions({ shop: bareShop }).blockDefaults).toEqual({});
        });

        it('matches the current ShopLayout chrome when an injected section predicate hides a slot', () => {
            const isSectionVisible = (id: string) => id !== 'header';
            expect(resolveExtensions({ shop: bareShop, isSectionVisible }).chrome).toEqual(
                resolveChromeLayout({ isVisible: (id) => isSectionVisible(id) }),
            );
            expect(resolveExtensions({ shop: bareShop, isSectionVisible }).chrome).toEqual([
                'info-bar',
                'content',
                'footer',
            ]);
        });
    });

    describe('populated manifest (overrides compose)', () => {
        it('supersedes the stored shop.theme with the manifest theme override', () => {
            const manifest: ShopExtensionManifest = { theme: { colors: { background: '#0b0b0b' } } };
            const resolved = resolveExtensions({ shop: bareShop, manifest });
            expect(resolved.theme.colors.background).toBe('#0b0b0b');
            // Untouched tokens still fall back to the platform default.
            expect(resolved.theme.colors.foreground).toBe(resolveTheme(bareShop).colors.foreground);
        });

        it('reorders chrome via the manifest order override', () => {
            const manifest: ShopExtensionManifest = { chrome: { order: ['footer', 'content', 'header', 'info-bar'] } };
            expect(resolveExtensions({ shop: bareShop, manifest }).chrome).toEqual([
                'footer',
                'content',
                'header',
                'info-bar',
            ]);
        });

        it('lets an explicit section override win over the injected predicate', () => {
            const manifest: ShopExtensionManifest = { sections: { 'info-bar': false, header: true } };
            const isSectionVisible = () => true;
            const { isSectionEnabled } = resolveExtensions({ shop: bareShop, manifest, isSectionVisible });
            expect(isSectionEnabled('info-bar')).toBe(false);
            expect(isSectionEnabled('header')).toBe(true);
            // A section the manifest does not mention defers to the injected predicate.
            expect(isSectionEnabled('footer')).toBe(true);
        });

        it('hides a chrome slot disabled by the manifest sections map', () => {
            const manifest: ShopExtensionManifest = { sections: { 'info-bar': false } };
            expect(resolveExtensions({ shop: bareShop, manifest }).chrome).toEqual(['header', 'content', 'footer']);
        });

        it('restricts block availability to the manifest subset and drops unknown ids gracefully', () => {
            const manifest: ShopExtensionManifest = { blocks: { available: ['banner', 'rich-text', 'ghost'] } };
            const { blocks } = resolveExtensions({ shop: bareShop, manifest });
            expect(blocks.available).toEqual(['banner', 'rich-text']);
            expect(blocks.isAvailable('banner')).toBe(true);
            expect(blocks.isAvailable('alert')).toBe(false);
            expect(blocks.isAvailable('ghost')).toBe(false);
        });

        it('normalizes product-card selections into fresh copies', () => {
            const selection = { layout: 'horizontal', ctaPlacement: 'inline-button' };
            const manifest: ShopExtensionManifest = { productCard: { search: selection } };
            const { productCard } = resolveExtensions({ shop: bareShop, manifest });
            expect(productCard.search).toEqual({ layout: 'horizontal', ctaPlacement: 'inline-button' });
            // A copy, never an alias of the manifest input.
            expect(productCard.search).not.toBe(selection);
        });

        it('normalizes block defaults into fresh copies', () => {
            const settings = { defaultLayout: 'grid' };
            const manifest: ShopExtensionManifest = { blockDefaults: { collection: settings } };
            const { blockDefaults } = resolveExtensions({ shop: bareShop, manifest });
            expect(blockDefaults.collection).toEqual({ defaultLayout: 'grid' });
            // A copy, never an alias of the manifest input.
            expect(blockDefaults.collection).not.toBe(settings);
        });

        it('defaults buildNotifier to enabled/bottom/dismissable when unset', () => {
            const r = resolveExtensions({ shop: bareShop, manifest: null });
            expect(r.buildNotifier).toEqual({
                enabled: true,
                position: 'bottom',
                copy: undefined,
                autoReload: false,
                dismissable: true,
            });
        });

        it('applies buildNotifier manifest overrides and fills the omitted dismissable from the default', () => {
            const r = resolveExtensions({
                shop: bareShop,
                manifest: { buildNotifier: { enabled: false, position: 'top', copy: 'Update!', autoReload: true } },
            });
            expect(r.buildNotifier).toEqual({
                enabled: false,
                position: 'top',
                copy: 'Update!',
                autoReload: true,
                // Omitted from the manifest → cascade fills the platform default.
                dismissable: true,
            });
        });
    });

    describe('validation', () => {
        it('throws a commerce TypeError when input is not an object', () => {
            expect(() => resolveExtensions(null as unknown as { shop: ThemeResolutionInput })).toThrow(
                expect.objectContaining({ name: 'TypeError', code: 'INVALID_TYPE' }),
            );
        });

        it('throws a commerce TypeError when the shop is missing', () => {
            expect(() => resolveExtensions({} as unknown as { shop: ThemeResolutionInput })).toThrow(
                expect.objectContaining({ name: 'TypeError', code: 'INVALID_TYPE' }),
            );
        });

        it('throws a commerce TypeError for an invalid chrome order (via resolveChromeLayout)', () => {
            const manifest: ShopExtensionManifest = { chrome: { order: ['header', 'content', 'ghost'] } };
            expect(() => resolveExtensions({ shop: bareShop, manifest })).toThrow(
                expect.objectContaining({ name: 'TypeError', code: 'INVALID_TYPE' }),
            );
        });
    });
});
