import { GenericErrorKind } from '@nordcom/commerce-errors';
import { describe, expect, it } from 'vitest';

import { ShopSchema } from '../models';
import {
    FONT_FAMILIES,
    type ResolvedShopTheme,
    resolveTheme,
    THEME_DEFAULTS,
    type ThemeResolutionInput,
} from './theme';

/**
 * Resolves the nested schema for a single-nested/array path, mirroring `shop.feature-flags.test.ts`
 * — Mongoose exposes it via `.schema`, `.caster.schema`, or `.casterConstructor.schema` depending
 * on the path kind.
 */
const nestedSchema = (path: {
    schema?: { path(name: string): { instance: string; isRequired?: boolean } };
    caster?: { schema?: { path(name: string): { instance: string; isRequired?: boolean } } };
    casterConstructor?: { schema?: { path(name: string): { instance: string; isRequired?: boolean } } };
}) => path.schema ?? path.caster?.schema ?? path.casterConstructor?.schema;

describe('models/shop — theme schema', () => {
    it('declares an optional `theme` path', () => {
        const path = ShopSchema.path('theme');
        expect(path).toBeDefined();
        expect(path.isRequired).toBeFalsy();
    });

    it('types color tokens as String and numeric/boolean product-card knobs accordingly', () => {
        const schema = nestedSchema(ShopSchema.path('theme') as never);
        expect(schema).toBeDefined();
        expect(schema!.path('colors.background').instance).toBe('String');
        expect(schema!.path('colors.foreground').instance).toBe('String');
        expect(schema!.path('productCard.titleLineClamp').instance).toBe('Number');
        expect(schema!.path('productCard.saleBadgeMinDiscount').instance).toBe('Number');
        expect(schema!.path('productCard.saleBadgeAllowOverlap').instance).toBe('Boolean');
        expect(schema!.path('productCard.ctaBg').instance).toBe('String');
    });

    it('treats the `default`-named ramp keys as String sub-paths, not schema options', () => {
        const schema = nestedSchema(ShopSchema.path('theme') as never);
        expect(schema!.path('colors.text.default').instance).toBe('String');
        expect(schema!.path('colors.text.muted').instance).toBe('String');
        expect(schema!.path('colors.border.default').instance).toBe('String');
        expect(schema!.path('colors.surface.base').instance).toBe('String');
    });

    it('keeps no theme leaf required so an unset theme persists nothing', () => {
        const schema = nestedSchema(ShopSchema.path('theme') as never);
        expect(schema!.path('colors.background').isRequired).toBeFalsy();
        expect(schema!.path('productCard.ctaBg').isRequired).toBeFalsy();
    });
});

describe('resolveTheme — backward-compat defaults', () => {
    it('resolves a shop with no theme to the platform defaults', () => {
        expect(resolveTheme({})).toEqual(THEME_DEFAULTS);
    });

    it('resolves an explicitly absent theme to the platform defaults', () => {
        expect(resolveTheme({ theme: null, design: { accents: [] } })).toEqual(THEME_DEFAULTS);
    });

    it('returns a fresh tree that never aliases or mutates the defaults', () => {
        const before = structuredClone(THEME_DEFAULTS);
        const resolved = resolveTheme({ theme: { colors: { background: '#000000' } } });

        expect(resolved).not.toBe(THEME_DEFAULTS);
        expect(resolved.productCard).not.toBe(THEME_DEFAULTS.productCard);
        expect(THEME_DEFAULTS).toEqual(before);
    });
});

describe('resolveTheme — merge semantics', () => {
    it('overlays authored tokens over defaults at every depth, leaving siblings defaulted', () => {
        const resolved = resolveTheme({
            theme: {
                colors: { background: '#0b0b0b' },
                productCard: { ctaBg: '#111111', titleLineClamp: 3 },
            },
        });

        expect(resolved.colors.background).toBe('#0b0b0b');
        expect(resolved.colors.foreground).toBe(THEME_DEFAULTS.colors.foreground);
        expect(resolved.productCard.ctaBg).toBe('#111111');
        expect(resolved.productCard.titleLineClamp).toBe(3);
        expect(resolved.productCard.ctaColor).toBe(THEME_DEFAULTS.productCard.ctaColor);
        expect(resolved.typography.fontFamily).toBe('public-sans');
    });

    it('populates accent light/dark shades only when overridden', () => {
        const withoutOverride = resolveTheme({});
        expect('accentPrimaryLight' in withoutOverride.colors).toBe(false);

        const withOverride = resolveTheme({ theme: { colors: { accentPrimaryLight: '#aabbcc' } } });
        expect(withOverride.colors.accentPrimaryLight).toBe('#aabbcc');
    });

    it('ignores prototype-polluting keys in authored overrides', () => {
        const malicious = JSON.parse('{"colors": {"__proto__": {"polluted": true}}}') as ResolvedShopTheme;
        resolveTheme({ theme: malicious });
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('falls back to the platform default for a persisted null leaf instead of emitting null', () => {
        const withNullLeaf = { theme: { colors: { background: null } } } as unknown as ThemeResolutionInput;
        expect(resolveTheme(withNullLeaf).colors.background).toBe(THEME_DEFAULTS.colors.background);
    });

    it('preserves an authored falsy-but-non-null leaf (0 does not fall back to the default)', () => {
        const resolved = resolveTheme({ theme: { productCard: { titleLineClamp: 0 } } });
        expect(resolved.productCard.titleLineClamp).toBe(0);
    });
});

describe('resolveTheme — font allowlist', () => {
    it('exposes public-sans as an allowlisted key matching the platform default', () => {
        expect(THEME_DEFAULTS.typography.fontFamily in FONT_FAMILIES).toBe(true);
        expect(THEME_DEFAULTS.typography.headingFamily in FONT_FAMILIES).toBe(true);
    });

    it('keeps the platform-default font keys when no typography override is set', () => {
        const resolved = resolveTheme({});
        expect(resolved.typography.fontFamily).toBe(THEME_DEFAULTS.typography.fontFamily);
        expect(resolved.typography.headingFamily).toBe(THEME_DEFAULTS.typography.headingFamily);
    });

    it('preserves authored font keys that are on the allowlist', () => {
        const resolved = resolveTheme({ theme: { typography: { fontFamily: 'inter', headingFamily: 'lora' } } });
        expect(resolved.typography.fontFamily).toBe('inter');
        expect(resolved.typography.headingFamily).toBe('lora');
    });

    it('narrows an unrecognized font value back to the platform-default key', () => {
        const resolved = resolveTheme({
            theme: { typography: { fontFamily: 'comic-sans-ms', headingFamily: 'wingdings' } },
        });
        expect(resolved.typography.fontFamily).toBe(THEME_DEFAULTS.typography.fontFamily);
        expect(resolved.typography.headingFamily).toBe(THEME_DEFAULTS.typography.headingFamily);
    });
});

describe('resolveTheme — accent precedence', () => {
    it('falls back to design.accents when theme has none', () => {
        const accents = [{ type: 'primary' as const, color: '#073b4c', foreground: '#ffffff' }];
        expect(resolveTheme({ design: { accents } }).colors.accents).toEqual(accents);
    });

    it('lets theme.colors.accents supersede design.accents', () => {
        const designAccents = [{ type: 'primary' as const, color: '#073b4c', foreground: '#ffffff' }];
        const themeAccents = [{ type: 'secondary' as const, color: '#118ab2', foreground: '#000000' }];
        const resolved = resolveTheme({
            design: { accents: designAccents },
            theme: { colors: { accents: themeAccents } },
        });
        expect(resolved.colors.accents).toEqual(themeAccents);
    });

    it('clones accents so the result never aliases the input', () => {
        const accents = [{ type: 'primary' as const, color: '#073b4c', foreground: '#ffffff' }];
        const resolved = resolveTheme({ design: { accents } });
        expect(resolved.colors.accents[0]).not.toBe(accents[0]);
    });

    it('defaults to an empty accent list when neither source provides one', () => {
        expect(resolveTheme({}).colors.accents).toEqual([]);
    });

    it('falls through an explicitly-empty theme accent list to design.accents', () => {
        const designAccents = [{ type: 'primary' as const, color: '#073b4c', foreground: '#ffffff' }];
        const resolved = resolveTheme({ theme: { colors: { accents: [] } }, design: { accents: designAccents } });
        expect(resolved.colors.accents).toEqual(designAccents);
    });
});

describe('resolveTheme — input guards', () => {
    const codeOf = (run: () => unknown): unknown => {
        try {
            run();
        } catch (error: unknown) {
            return (error as { code?: unknown }).code;
        }
        return undefined;
    };

    it('throws a commerce INVALID_TYPE error when shop is null', () => {
        expect(codeOf(() => resolveTheme(null as unknown as Parameters<typeof resolveTheme>[0]))).toBe(
            GenericErrorKind.INVALID_TYPE,
        );
    });

    it('throws a commerce INVALID_TYPE error when shop is not an object', () => {
        expect(codeOf(() => resolveTheme('nope' as unknown as Parameters<typeof resolveTheme>[0]))).toBe(
            GenericErrorKind.INVALID_TYPE,
        );
    });
});
