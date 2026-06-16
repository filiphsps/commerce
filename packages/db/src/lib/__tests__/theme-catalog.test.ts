import { describe, expect, it } from 'vitest';

import { THEME_DEFAULTS } from '../theme';
import { deriveCatalog, productCardCustomProperty, THEME_TOKEN_CATALOG } from '../theme-catalog';

/**
 * Recursively collects the dotted leaf paths of a value tree, prefixed with `theme`. Arrays are
 * treated as leaves (the empty `colors.accents` default has no element shape to descend into), so a
 * leaf is either a primitive or an array node.
 *
 * @param value - The node to flatten.
 * @param prefix - The accumulated dotted prefix for `value`.
 * @returns The dotted leaf paths under `value`.
 */
const flattenLeafPaths = (value: unknown, prefix: string): string[] => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return [prefix];
    }

    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
        flattenLeafPaths(child, `${prefix}.${key}`),
    );
};

/**
 * Deep-gets a dotted path (sans the leading `theme.`) from `THEME_DEFAULTS`.
 *
 * @param path - The dotted path, e.g. `colors.background`.
 * @returns The value at `path`, or `undefined` when absent.
 */
const deepGet = (path: string): unknown =>
    path.split('.').reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], THEME_DEFAULTS);

const ACCENTS_ARRAY_PATH = 'theme.colors.accents';

describe('theme-catalog', () => {
    const defaultLeaves = flattenLeafPaths(THEME_DEFAULTS, 'theme');
    const catalogPaths = THEME_TOKEN_CATALOG.map((token) => token.path);
    const derivedPaths = THEME_TOKEN_CATALOG.filter((token) => token.derived).map((token) => token.path);
    const accentElementPaths = catalogPaths.filter((path) => path.startsWith(`${ACCENTS_ARRAY_PATH}[]`));

    it('has a unique path per row', () => {
        expect(new Set(catalogPaths).size).toBe(catalogPaths.length);
    });

    it('emits a well-formed `--kebab` CSS custom property per row', () => {
        for (const token of THEME_TOKEN_CATALOG) {
            expect(token.cssVar, token.path).toMatch(/^--[a-z][a-z0-9-]*$/);
        }
    });

    it('aliases a CSS property from at most the documented overlaps', () => {
        // Most rows own a unique `cssVar`; the only sanctioned exceptions are the elevation group
        // and the legacy productCard shadow knobs, which deliberately both drive the card-shadow
        // properties (semantic alias over legacy knob — last-wins in the serializer). Any *other*
        // collision is a copy-paste bug that would silently make one knob inert in the admin, so we
        // pin the duplicate set exactly: a new accidental alias fails this, and intentionally
        // dropping an alias updates it here on purpose.
        const byCssVar = new Map<string, string[]>();
        for (const token of THEME_TOKEN_CATALOG) {
            byCssVar.set(token.cssVar, [...(byCssVar.get(token.cssVar) ?? []), token.path]);
        }
        const aliased = Object.fromEntries([...byCssVar].filter(([, paths]) => paths.length > 1));
        expect(aliased).toEqual({
            '--product-card-shadow': ['theme.elevation.card', 'theme.productCard.shadow'],
            '--product-card-shadow-hover': ['theme.elevation.cardHover', 'theme.productCard.shadowHover'],
        });
    });

    describe('bijection between THEME_DEFAULTS leaves and catalog paths', () => {
        // Normalize the catalog onto the default-leaf address space: collapse the three accent
        // element rows onto the single `colors.accents` array leaf, and drop the derived tokens
        // (absent from THEME_DEFAULTS by design — they default to runtime colord derivation).
        const normalizedCatalogPaths = new Set(
            catalogPaths
                .filter((path) => !derivedPaths.includes(path))
                .map((path) => (path.startsWith(`${ACCENTS_ARRAY_PATH}[]`) ? ACCENTS_ARRAY_PATH : path)),
        );

        it('maps every default leaf to at least one catalog row (forward)', () => {
            for (const leaf of defaultLeaves) {
                expect(normalizedCatalogPaths.has(leaf)).toBe(true);
            }
        });

        it('maps every non-derived catalog row back to a default leaf (reverse)', () => {
            for (const path of normalizedCatalogPaths) {
                expect(defaultLeaves).toContain(path);
            }
        });

        it('maps the accents array leaf to exactly the three element rows', () => {
            expect(defaultLeaves).toContain(ACCENTS_ARRAY_PATH);
            expect(accentElementPaths).toEqual([
                `${ACCENTS_ARRAY_PATH}[].type`,
                `${ACCENTS_ARRAY_PATH}[].color`,
                `${ACCENTS_ARRAY_PATH}[].foreground`,
            ]);
        });

        it('maps every non-accent default leaf to exactly one catalog row', () => {
            for (const leaf of defaultLeaves) {
                if (leaf === ACCENTS_ARRAY_PATH) {
                    continue;
                }
                expect(catalogPaths.filter((path) => path === leaf)).toHaveLength(1);
            }
        });

        it('exposes the four derived accent shades, none of which exist in THEME_DEFAULTS', () => {
            expect(derivedPaths).toEqual([
                'theme.colors.accentPrimaryLight',
                'theme.colors.accentPrimaryDark',
                'theme.colors.accentSecondaryLight',
                'theme.colors.accentSecondaryDark',
            ]);
            for (const path of derivedPaths) {
                expect(deepGet(path.replace(/^theme\./, ''))).toBeUndefined();
            }
        });
    });

    it('derives every productCard cssVar via productCardCustomProperty', () => {
        for (const token of THEME_TOKEN_CATALOG) {
            if (token.group !== 'productCard') {
                continue;
            }
            const key = token.path.replace('theme.productCard.', '') as Parameters<typeof productCardCustomProperty>[0];
            expect(token.cssVar).toBe(productCardCustomProperty(key));
        }
    });

    it('deep-gets a concrete default for every non-derived, non-accent-element token', () => {
        for (const token of THEME_TOKEN_CATALOG) {
            if (token.derived || token.path.startsWith(`${ACCENTS_ARRAY_PATH}[]`)) {
                continue;
            }
            expect(deepGet(token.path.replace(/^theme\./, ''))).not.toBeUndefined();
        }
    });

    describe('deriveCatalog', () => {
        const grouped = deriveCatalog();

        it('preserves declaration order of groups, clusters and tokens', () => {
            const flattened = [...grouped.values()].flatMap((clusters) => [...clusters.values()].flat());
            expect(flattened.map((token) => token.path)).toEqual(catalogPaths);
        });

        it('buckets productCard knobs into the declared clusters in declaration order', () => {
            const productCard = grouped.get('productCard');
            expect(productCard).toBeDefined();
            expect([...productCard!.keys()]).toEqual([
                'chassis',
                'image',
                'vendor',
                'title',
                'price',
                'swatch',
                'chip',
                'more',
                'cta',
                'overlay',
                'oos',
                'motion',
                'sale',
            ]);
            // No cluster may be empty — an empty bucket means a cluster name was declared on a row
            // that was later removed, leaving a dead group header in the admin nav.
            for (const [cluster, tokens] of productCard!) {
                expect(tokens.length, cluster).toBeGreaterThan(0);
            }
        });
    });

    describe('enum constraints', () => {
        const enumTokens = THEME_TOKEN_CATALOG.filter((token) => token.valueKind === 'enum');

        it('declares a non-empty option list wherever enumValues is present', () => {
            // The two font-family rows intentionally omit enumValues (the font-preview control sources
            // FONT_FAMILIES itself); every other enum must ship its own options or the select is empty.
            for (const token of enumTokens) {
                if (token.enumValues) {
                    expect(token.enumValues.length, token.path).toBeGreaterThan(0);
                }
            }
        });

        it('defaults every concrete enum to a value inside its own options', () => {
            // Catches a default that drifts out of its allowed set (e.g. renaming an enum value but
            // forgetting THEME_DEFAULTS), which would render a phantom selection in the admin and a
            // value no storefront branch handles. Accent-element rows have no scalar default to check
            // (the accents array defaults to empty); derived tokens have no default at all.
            for (const token of enumTokens) {
                if (!token.enumValues || token.derived || token.path.startsWith(`${ACCENTS_ARRAY_PATH}[]`)) {
                    continue;
                }
                const value = deepGet(token.path.replace(/^theme\./, ''));
                expect(token.enumValues, token.path).toContain(value);
            }
        });
    });

    describe('number constraints', () => {
        const numberTokens = THEME_TOKEN_CATALOG.filter((token) => token.valueKind === 'number');

        it('keeps any declared min below max', () => {
            for (const token of numberTokens) {
                if (typeof token.min === 'number' && typeof token.max === 'number') {
                    expect(token.min, token.path).toBeLessThan(token.max);
                }
            }
        });

        it('constrains every font-weight token to the 100–900 step-100 scale', () => {
            const weights = numberTokens.filter((token) => /weight$/i.test(token.path));
            expect(weights.length).toBeGreaterThan(0);
            for (const token of weights) {
                expect({ path: token.path, min: token.min, max: token.max, step: token.step }).toEqual({
                    path: token.path,
                    min: 100,
                    max: 900,
                    step: 100,
                });
            }
        });

        it('constrains the 0–1 opacity tokens to a 0.05 step', () => {
            const opacities = numberTokens.filter((token) => token.max === 1);
            expect(opacities.length).toBeGreaterThan(0);
            for (const token of opacities) {
                expect({ path: token.path, min: token.min, step: token.step }).toEqual({
                    path: token.path,
                    min: 0,
                    step: 0.05,
                });
            }
        });
    });
});
