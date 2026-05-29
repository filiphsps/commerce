import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { THEME_DEFAULTS } from '@nordcom/commerce-db';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'globals.css'), 'utf8');

// Tailwind v4's default font-size scale. The P3-3 `--text-*` layer reuses Tailwind's own
// theme-variable names, so it must pin these exact values for the redeclaration to stay inert.
const TAILWIND_V4_TYPE_SCALE = {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
} as const;

// Tailwind v4's default font-weight scale. The `--font-weight-*` base reuses Tailwind's own
// theme-variable names (consumed by `font-normal` … `font-bold`), so it pins these exact values for
// the redeclaration to stay inert until a shop overrides `typography.fontWeights`.
const TAILWIND_V4_FONT_WEIGHTS = {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
} as const;

describe('globals.css', () => {
    describe('semantic token layer (P3-3)', () => {
        it('pins the --text-* scale to the Tailwind v4 defaults so the redeclaration is inert', () => {
            for (const [step, value] of Object.entries(TAILWIND_V4_TYPE_SCALE)) {
                expect(css).toContain(`--text-${step}: ${value};`);
                // Keep globals.css and the db `THEME_DEFAULTS` scale (the resolved source) in lockstep.
                expect(THEME_DEFAULTS.typography.scale[step as keyof typeof TAILWIND_V4_TYPE_SCALE]).toBe(value);
            }
        });

        it('pins the --font-weight-* scale to the Tailwind v4 defaults so the redeclaration is inert', () => {
            for (const [step, value] of Object.entries(TAILWIND_V4_FONT_WEIGHTS)) {
                expect(css).toContain(`--font-weight-${step}: ${value};`);
                // Keep globals.css and the db `THEME_DEFAULTS` weights (the resolved source) in lockstep.
                expect(THEME_DEFAULTS.typography.fontWeights[step as keyof typeof TAILWIND_V4_FONT_WEIGHTS]).toBe(
                    value,
                );
            }
        });

        it('wires the semantic aliases to the platform color/shadow tokens', () => {
            expect(css).toContain('--surface-1: var(--color-block);');
            expect(css).toContain('--surface-2: var(--color-block-light);');
            expect(css).toContain('--surface-3: var(--color-block-dark);');
            expect(css).toContain('--text: var(--color-foreground, var(--color-dark));');
            expect(css).toContain('--text-muted: var(--color-dark-secondary);');
            expect(css).toContain('--border-strong: var(--color-block-dark);');
            expect(css).toContain('--state-sale: var(--color-sale);');
            expect(css).toContain('--state-danger: var(--color-danger);');
            expect(css).toContain('--state-success: var(--color-block-success);');
            expect(css).toContain('--state-info: var(--color-block-info);');
            expect(css).toContain('--focus-ring: var(--accent);');
            expect(css).toContain('--elevation-1: var(--product-card-shadow);');
            expect(css).toContain('--elevation-2: var(--product-card-shadow-hover);');
            expect(css).toContain('--elevation-3: var(--header-panel-shadow);');
        });

        it('collapses the accent duplication onto --color-accent-* with platform-default fallbacks', () => {
            // The literal lives only in the var() fallback, so a theme-less shop is byte-identical.
            expect(css).toContain('--accent-primary: var(--color-accent-primary, #073b4c);');
            expect(css).toContain('--accent-secondary: var(--color-accent-secondary, #118ab2);');
        });
    });

    describe('byte-identical token bases (P3-2)', () => {
        // Each consumed CSS var the serializer can emit (diff-from-default) MUST have a base default
        // in globals.css value-equal to its `THEME_DEFAULTS` source, so a theme-less shop — which
        // emits nothing — falls through to exactly the value master always rendered.
        const t = THEME_DEFAULTS;
        // NB: --color-background / --color-foreground are intentionally NOT in this list. They have
        // no globals.css base — master emitted them only inside the branding <style>, so an unbranded
        // shop falls back to --color-bright/--color-dark (#ffffff/#222222). Defining a base would
        // change that unbranded render; the conditional emit in CssVariablesProvider preserves it.
        const BASES: ReadonlyArray<readonly [cssVar: string, value: string | number]> = [
            ['--color-block', t.colors.surface.base],
            ['--color-block-light', t.colors.surface.raised],
            ['--color-block-dark', t.colors.surface.sunken],
            ['--color-dark', t.colors.text.default],
            ['--color-dark-secondary', t.colors.text.muted],
            ['--color-sale', t.colors.state.sale],
            ['--color-danger', t.colors.state.danger],
            ['--color-block-success', t.colors.state.success],
            ['--color-block-info', t.colors.state.info],
            ['--block-border-radius', t.radii.block],
            ['--block-border-radius-large', t.radii.blockLarge],
            ['--block-border-radius-small', t.radii.blockSmall],
            ['--block-border-radius-tiny', t.radii.blockTiny],
            ['--block-padding', t.spacing.blockPadding],
            ['--block-spacer', t.spacing.blockSpacer],
            ['--product-card-shadow', t.elevation.card],
            ['--product-card-shadow-hover', t.elevation.cardHover],
            ['--header-panel-shadow', t.elevation.panel],
        ];

        it('defines every serializer-overridable base value-equal to THEME_DEFAULTS', () => {
            for (const [cssVar, value] of BASES) {
                expect(css).toContain(`${cssVar}: ${value};`);
            }
        });

        it('places the block-geometry bases in :root, not html:root, so per-shop :root wins', () => {
            // `\n:root {` matches only the top-level `:root` blocks; `html:root` (preceded by `html`,
            // not a newline) and the `@media … html:root` step are skipped.
            const rootBlocks = css.match(/\n:root\s*\{[^}]*\}/g) ?? [];
            const inRoot = (token: string) => rootBlocks.some((block) => block.includes(`${token}:`));
            for (const token of [
                '--block-border-radius',
                '--block-padding',
                '--block-spacer',
                '--header-panel-shadow',
            ]) {
                expect(inRoot(token)).toBe(true);
            }
        });
    });

    describe('legacy product-card tokens', () => {
        // Pre-Phase-5 primitives (e.g. variant-title.tsx) still read these names; removal is P5-8.
        it('keeps the LEGACY tokens defined', () => {
            for (const token of [
                '--product-card-title-size',
                '--product-card-title-weight',
                '--product-card-title-color',
                '--product-card-radius',
                '--product-card-padding',
                '--product-card-gap',
                '--product-card-vendor-size',
                '--product-card-image-radius',
            ]) {
                expect(css).toContain(`${token}:`);
            }
        });
    });
});
