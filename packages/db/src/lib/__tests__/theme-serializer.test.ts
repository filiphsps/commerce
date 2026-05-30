import { describe, expect, it } from 'vitest';

import type { ShopThemeTokens, ThemeBranding } from '../theme';
import { resolveTheme, serializeThemeToCssVars, THEME_DEFAULTS } from '../theme';
import { THEME_TOKEN_CATALOG, type ThemeTokenMeta } from '../theme-catalog';

const BRANDING: ThemeBranding = {
    primary: { type: 'primary', color: '#112233', foreground: '#000000' },
    secondary: { type: 'secondary', color: '#445566', foreground: '#ffffff' },
};

/**
 * Deep-gets a dotted path (sans the leading `theme.`) from `THEME_DEFAULTS`.
 *
 * @param path - The dotted path, e.g. `colors.background`.
 * @returns The default value, or `undefined` when absent.
 */
const defaultAt = (path: string): unknown =>
    path.split('.').reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], THEME_DEFAULTS);

/**
 * Builds a nested {@link ShopThemeTokens} fragment placing `value` at `path` (sans the `theme.` root).
 *
 * @param path - The dotted path, e.g. `colors.surface.base`.
 * @param value - The leaf value to set.
 * @returns A nested partial theme object.
 */
const unflatten = (path: string, value: unknown): ShopThemeTokens => {
    const keys = path.split('.');
    const root: Record<string, unknown> = {};
    let cursor = root;
    keys.forEach((key, index) => {
        if (index === keys.length - 1) {
            cursor[key] = value;
            return;
        }
        cursor[key] = {};
        cursor = cursor[key] as Record<string, unknown>;
    });
    return root as ShopThemeTokens;
};

/**
 * Produces a value for `token` that is guaranteed to differ from its platform default, so the
 * serializer's diff-from-default path emits the token. Returns `null` when the token has no
 * non-default value (single-option enums).
 *
 * @param token - The catalog token to override.
 * @param leafPath - The dotted leaf path (sans `theme.`) used to read the default.
 * @returns A non-default override value, or `null` when none exists.
 */
const nonDefaultOverride = (token: ThemeTokenMeta, leafPath: string): string | number | boolean | null => {
    const current = defaultAt(leafPath);
    switch (token.valueKind) {
        case 'color':
            return '#abcdef';
        case 'dimension':
            return '123px';
        case 'number':
            return current === 13 ? 17 : 13;
        case 'boolean':
            return !(current as boolean);
        case 'enum': {
            const option = token.enumValues?.find((value) => value !== current);
            return option ?? null;
        }
    }
};

describe('serializeThemeToCssVars — catalog coverage', () => {
    for (const token of THEME_TOKEN_CATALOG) {
        // The two font-family tokens are bound by `next/font` (className-scoped variables), not by
        // this serializer; the three accent array rows feed the branding fan-out under different var
        // names. Both are out of the serializer's emit domain.
        if (token.group === 'typography' && token.cluster === 'family') {
            continue;
        }
        if (token.path.startsWith('theme.colors.accents[]')) {
            continue;
        }

        const leafPath = token.path.replace(/^theme\./, '');
        const override = nonDefaultOverride(token, leafPath);

        // Single-option enums have no non-default value, so there is nothing to emit for them.
        if (override === null) {
            it.skip(`${token.path} (single-option, no non-default value)`, () => {});
            continue;
        }

        it(`emits ${token.cssVar} for a non-default ${token.path}`, () => {
            const theme = resolveTheme({ theme: unflatten(leafPath, override) });
            const names = serializeThemeToCssVars(theme, BRANDING).map(([name]) => name);
            expect(names).toContain(token.cssVar);
        });
    }
});

describe('serializeThemeToCssVars — contract', () => {
    it('returns an empty array for a theme-less, unbranded shop', () => {
        expect(serializeThemeToCssVars(THEME_DEFAULTS, null)).toEqual([]);
    });

    it('emits page chrome at its resolved value when branding resolves, even at defaults', () => {
        const pairs = serializeThemeToCssVars(THEME_DEFAULTS, BRANDING);
        expect(pairs).toContainEqual(['--color-background', THEME_DEFAULTS.colors.background]);
        expect(pairs).toContainEqual(['--color-foreground', THEME_DEFAULTS.colors.foreground]);
    });

    it('wraps quoted product-card knobs in CSS quotes on emit', () => {
        const theme = resolveTheme({ theme: { productCard: { saleBadgeText: 'SALE' } } });
        expect(serializeThemeToCssVars(theme, null)).toContainEqual(['--product-card-sale-badge-text', '"SALE"']);
    });

    it('derives accent light/dark via colord but honors a theme-pinned shade', () => {
        const theme = resolveTheme({ theme: { colors: { accentPrimaryLight: '#abcdef' } } });
        const pairs = serializeThemeToCssVars(theme, BRANDING);
        expect(pairs).toContainEqual(['--color-accent-primary-light', '#abcdef']);
        // The un-pinned dark shade still derives from the base accent.
        expect(pairs.find(([name]) => name === '--color-accent-primary-dark')).toBeDefined();
    });
});
