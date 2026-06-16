import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Raw-utility lint gate + text-on-surface contrast check for the P5 semantic-token migration
 * (.specs/2026-05-28-storefront-theming/, P5-1 / P5-9).
 *
 * The migration replaced hard-coded Tailwind color utilities with the P3-3 semantic tokens so an
 * un-customized shop renders identically while becoming tenant-themeable. This file ratchets that
 * work: it FAILS the build if a banned raw-color utility reappears in a migrated file, and it pins
 * the platform-default contrast of the new text-on-surface token pairs to WCAG AA.
 */

const SRC_DIR = dirname(fileURLToPath(import.meta.url));

/** UI directories the P5 component/route migration covered; the gate scans these recursively. */
const SCAN_DIRS = ['components', 'app', 'blocks'] as const;

/**
 * Raw Tailwind color utilities the migration eliminated, each mapping to a P3-3 semantic token.
 *
 * The `bg-white` / `text-white` patterns match only the bare literal utility (with optional opacity
 * modifier such as `bg-white/95`); arbitrary-value and token classes — `bg-[#fff]`, `bg-[var(--x)]`,
 * `bg-(--surface-2)` — never contain the contiguous word `white`, so they are inherently exempt, as
 * the work-map requires.
 */
const BANNED_UTILITIES: ReadonlyArray<{ readonly name: string; readonly pattern: RegExp }> = [
    { name: 'bg-gray-*', pattern: /\bbg-gray-\d/ },
    { name: 'text-gray-*', pattern: /\btext-gray-\d/ },
    { name: 'border-gray-*', pattern: /\bborder-gray-\d/ },
    { name: 'text-red-*', pattern: /\btext-red-\d/ },
    { name: 'bg-green-*', pattern: /\bbg-green-\d/ },
    { name: 'text-amber-*', pattern: /\btext-amber-\d/ },
    { name: 'bg-white', pattern: /\bbg-white\b/ },
    { name: 'text-white', pattern: /\btext-white\b/ },
];

// Reasons a file may retain a banned utility. Each maps to a genuine gap, not an unmigrated oversight
// — the ratchet only shrinks: when a gap closes, its entry must be removed (the stale-entry test
// enforces that). The WHITE_SURFACE / WARNING_GAP / SUCCESS_PILL_GAP gaps are now closed by the
// `--surface-0` / `--state-warning` / `--surface-success`+`--text-success-strong` tokens, so their
// reasons (and every file that carried only them) have dropped off below.
const WHITE_ON_BRAND =
    'text-white is the legible foreground on a saturated colored/branded badge or button (--state-success / sale-stripes / brand). No on-color foreground token exists; the white-on-success / white-on-danger assertions below guard its contrast.';
const CMS_BLOCK =
    'CMS block outside the P5 component/route migration scope; its bg-gray-* / border-gray-* migrate with the block batch.';
const DOC_COMMENT = 'Match is a doc-comment reference to the legacy bg-gray-100 class, not a live utility.';

/**
 * Files in scope that still carry a banned utility for a documented reason, keyed by their
 * POSIX-relative path under {@link SRC_DIR}. The gate excuses exactly these; everything else in the
 * migrated set must be clean. Shrink this list as each gap closes.
 */
const ALLOWLIST: ReadonlyMap<string, string> = new Map([
    ['app/[domain]/[locale]/loading.tsx', DOC_COMMENT],
    ['app/[domain]/[locale]/products/[handle]/page.tsx', WHITE_ON_BRAND],
    ['app/[domain]/[locale]/products/[handle]/product-content.tsx', WHITE_ON_BRAND],
    ['blocks/banner.tsx', `${CMS_BLOCK} ${WHITE_ON_BRAND}`],
    ['blocks/media-grid.tsx', CMS_BLOCK],
    ['blocks/rich-text.tsx', CMS_BLOCK],
    ['components/actionable/button.tsx', WHITE_ON_BRAND],
    ['components/informational/alert.tsx', WHITE_ON_BRAND],
    ['components/product-display/primitives/variant-badges.tsx', WHITE_ON_BRAND],
    ['components/products/product-quantity-breaks.tsx', WHITE_ON_BRAND],
]);

/**
 * Recursively collect non-test TypeScript source files under a directory.
 *
 * @param dir - Absolute directory to walk.
 * @returns Absolute paths of every `.ts` / `.tsx` file, excluding `*.test.*`, `*.spec.*`, and `*.stories.*`.
 */
function collectSourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            return collectSourceFiles(full);
        }
        if (!/\.tsx?$/.test(entry.name) || /\.(test|spec|stories)\./.test(entry.name)) {
            return [];
        }
        return [full];
    });
}

/**
 * The POSIX-relative paths (under {@link SRC_DIR}) of every scanned source file.
 *
 * @returns Sorted relative paths across {@link SCAN_DIRS}.
 */
function scannedFiles(): string[] {
    return SCAN_DIRS.flatMap((scanDir) => collectSourceFiles(join(SRC_DIR, scanDir)))
        .map((file) => relative(SRC_DIR, file).split(sep).join('/'))
        .sort();
}

/**
 * Names of the banned utilities present in a file's text.
 *
 * @param relativePath - POSIX-relative path under {@link SRC_DIR}.
 * @returns The matched {@link BANNED_UTILITIES} names, or an empty array when the file is clean.
 */
function bannedUtilitiesIn(relativePath: string): string[] {
    const text = readFileSync(join(SRC_DIR, relativePath), 'utf8');
    return BANNED_UTILITIES.filter(({ pattern }) => pattern.test(text)).map(({ name }) => name);
}

const css = readFileSync(join(SRC_DIR, 'app', 'globals.css'), 'utf8');

describe('raw-utility lint gate (P5-1)', () => {
    it('keeps the migrated set free of raw color utilities', () => {
        const violations = scannedFiles()
            .filter((file) => !ALLOWLIST.has(file))
            .flatMap((file) => bannedUtilitiesIn(file).map((utility) => `${file} → ${utility}`));

        expect(violations).toEqual([]);
    });

    it('allowlists only in-scope files', () => {
        const scanned = new Set(scannedFiles());
        const outOfScope = [...ALLOWLIST.keys()].filter((file) => !scanned.has(file));

        expect(outOfScope).toEqual([]);
    });

    it('carries no stale allowlist entries, so the ratchet only shrinks', () => {
        // A file that no longer trips a banned pattern must drop off the allowlist; otherwise the
        // gate would silently permit a regression to creep back into a now-clean file.
        const stale = [...ALLOWLIST.keys()].filter((file) => bannedUtilitiesIn(file).length === 0);

        expect(stale).toEqual([]);
    });
});

/**
 * Parse a 6-digit hex color into its 0–255 sRGB channels.
 *
 * @param hex - A `#rrggbb` color string.
 * @returns The red, green, and blue channel values.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const normalized = hex.replace('#', '');
    return {
        r: Number.parseInt(normalized.slice(0, 2), 16),
        g: Number.parseInt(normalized.slice(2, 4), 16),
        b: Number.parseInt(normalized.slice(4, 6), 16),
    };
}

/**
 * WCAG 2.1 relative luminance of an sRGB color.
 *
 * @param hex - A `#rrggbb` color string.
 * @returns The relative luminance in `[0, 1]` (0 = black, 1 = white).
 */
function relativeLuminance(hex: string): number {
    const { r, g, b } = hexToRgb(hex);
    const linearize = (value: number): number => {
        const channel = value / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * WCAG 2.1 contrast ratio between two sRGB colors.
 *
 * @param a - First `#rrggbb` color.
 * @param b - Second `#rrggbb` color.
 * @returns The contrast ratio in `[1, 21]`, order-independent.
 */
function contrastRatio(a: string, b: string): number {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Platform-default resolved values of the P3-3 semantic tokens, traced through globals.css. The
// `globals.css source` test below pins each literal to its source declaration, so a future change to
// a platform default re-triggers this contrast review instead of silently regressing accessibility.
const TOKENS = {
    white: '#ffffff', // --color-bright
    text: '#222222', // --text → --color-foreground (unset) → --color-dark
    textMuted: '#555555', // --text-muted → --color-dark-secondary
    surface1: '#f3f3f3', // --surface-1 → --color-block
    surface2: '#f5f5f5', // --surface-2 → --color-block-light
    stateSale: '#b51200', // --state-sale → --color-sale
    stateDanger: '#a53d3a', // --state-danger → --color-danger
    stateSuccess: '#3b9e2e', // --state-success → --color-block-success
    stateSuccessDark: '#2a7221', // --color-block-success-dark (the darken remedy for normal-weight text)
    stateWarning: '#b54a2a', // --state-warning → --product-card-urgency-color
    surfaceSuccess: '#e1faea', // --surface-success → --color-green-light
    textSuccessStrong: '#093f09', // --text-success-strong → --color-green-dark
    surfaceWarning: '#fdeede', // --surface-warning → --color-warning-light
    textWarningStrong: '#6b3410', // --text-warning-strong → --color-warning-dark
    badgeGiftCard: '#9333ea', // --badge-gift-card-bg
    badgeSubscription: '#2563eb', // --badge-subscription-bg
    surfaceInfo: '#e6f4f8', // --surface-info → --color-info-light
    textInfoStrong: '#1c5d99', // --text-info-strong → --color-block-info-dark
    vendor: '#6b6555', // --product-card-vendor-color
} as const;

// The Tailwind gray-400 (#9ca3af) that `text-muted` replaces for disabled/placeholder text; kept here
// only as the historical baseline the migration improves on.
const REPLACED_GRAY_400 = '#9ca3af';

// The Tailwind amber-600 (#d97706) that `--state-warning` replaces for low-stock / back-order text;
// kept here only as the historical baseline the migration improves on (amber-600 fails normal AA on
// white at ~3.2:1).
const REPLACED_AMBER_600 = '#d97706';

const AA_NORMAL = 4.5;
const AA_LARGE = 3.0;

describe('text-on-surface contrast (P5-9, WCAG AA)', () => {
    it('pins each token literal to its globals.css source so a default change re-triggers review', () => {
        const sources: ReadonlyArray<readonly [string, string]> = [
            ['--color-bright', TOKENS.white],
            ['--color-dark', TOKENS.text],
            ['--color-dark-secondary', TOKENS.textMuted],
            ['--color-block', TOKENS.surface1],
            ['--color-block-light', TOKENS.surface2],
            ['--color-sale', TOKENS.stateSale],
            ['--color-danger', TOKENS.stateDanger],
            ['--color-block-success', TOKENS.stateSuccess],
            ['--color-block-success-dark', TOKENS.stateSuccessDark],
            ['--product-card-urgency-color', TOKENS.stateWarning],
            ['--color-green-light', TOKENS.surfaceSuccess],
            ['--color-green-dark', TOKENS.textSuccessStrong],
            ['--color-warning-light', TOKENS.surfaceWarning],
            ['--color-warning-dark', TOKENS.textWarningStrong],
            ['--badge-gift-card-bg', TOKENS.badgeGiftCard],
            ['--badge-subscription-bg', TOKENS.badgeSubscription],
            ['--color-info-light', TOKENS.surfaceInfo],
            ['--color-block-info-dark', TOKENS.textInfoStrong],
            ['--product-card-vendor-color', TOKENS.vendor],
        ];
        for (const [name, value] of sources) {
            expect(css).toContain(`${name}: ${value};`);
        }
    });

    it.each([
        // assess-design flagged text-gray-500 on bg-gray-100 (~4.0:1); --text-muted is darker, so it improves.
        { label: '--text-muted on --surface-1', fg: TOKENS.textMuted, bg: TOKENS.surface1 },
        { label: '--text-muted on --surface-2', fg: TOKENS.textMuted, bg: TOKENS.surface2 },
        { label: '--text-muted on white', fg: TOKENS.textMuted, bg: TOKENS.white },
        // assess-design flagged vendor color on white.
        { label: '--product-card-vendor-color on white', fg: TOKENS.vendor, bg: TOKENS.white },
        { label: '--product-card-vendor-color on --surface-2', fg: TOKENS.vendor, bg: TOKENS.surface2 },
        // discount price → --state-sale.
        { label: '--state-sale on white', fg: TOKENS.stateSale, bg: TOKENS.white },
        { label: '--state-sale on --surface-1', fg: TOKENS.stateSale, bg: TOKENS.surface1 },
        // alert / error foreground → white on --state-danger.
        { label: 'white on --state-danger', fg: TOKENS.white, bg: TOKENS.stateDanger },
        // low-stock / back-order warning → --state-warning on white (replaces text-amber-600).
        { label: '--state-warning on white', fg: TOKENS.stateWarning, bg: TOKENS.white },
        // soft-success discount pill → --text-success-strong on --surface-success (replaces green-950/green-200).
        {
            label: '--text-success-strong on --surface-success',
            fg: TOKENS.textSuccessStrong,
            bg: TOKENS.surfaceSuccess,
        },
        // soft-warning alert → --text-warning-strong on --surface-warning (replaces hard-coded bg-yellow-200).
        {
            label: '--text-warning-strong on --surface-warning',
            fg: TOKENS.textWarningStrong,
            bg: TOKENS.surfaceWarning,
        },
        // soft-info alert → --text-info-strong on --surface-info.
        { label: '--text-info-strong on --surface-info', fg: TOKENS.textInfoStrong, bg: TOKENS.surfaceInfo },
        // product overlay badges → white on the gift-card / subscription badge fills.
        { label: 'white on --badge-gift-card-bg', fg: TOKENS.white, bg: TOKENS.badgeGiftCard },
        { label: 'white on --badge-subscription-bg', fg: TOKENS.white, bg: TOKENS.badgeSubscription },
        // body text baseline.
        { label: '--text on --surface-1', fg: TOKENS.text, bg: TOKENS.surface1 },
    ])('passes normal AA: $label', ({ fg, bg }) => {
        expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_NORMAL);
    });

    it('keeps white-on-success legible for the bold/large in-stock badge only', () => {
        // The in-stock / vegan badge (products/[handle]/page, variant-badges) is white on --state-success.
        // At ~3.43:1 it clears the large/bold threshold but NOT normal AA, so the badge MUST stay
        // bold + uppercase. For any normal-weight white text on success, switch to
        // --color-block-success-dark (#2a7221), which clears normal AA — asserted below as the remedy.
        const onSuccess = contrastRatio(TOKENS.white, TOKENS.stateSuccess);
        expect(onSuccess).toBeGreaterThanOrEqual(AA_LARGE);
        expect(onSuccess).toBeLessThan(AA_NORMAL);
        expect(contrastRatio(TOKENS.white, TOKENS.stateSuccessDark)).toBeGreaterThanOrEqual(AA_NORMAL);
    });

    it('improves disabled/placeholder legibility by replacing gray-400 with the darker --text-muted', () => {
        // --text-muted must read as a muted-but-legible color, strictly darker (higher contrast on
        // white) than the gray-400 it replaced — which itself fails AA.
        expect(relativeLuminance(TOKENS.textMuted)).toBeLessThan(relativeLuminance(REPLACED_GRAY_400));
        expect(contrastRatio(TOKENS.textMuted, TOKENS.white)).toBeGreaterThan(
            contrastRatio(REPLACED_GRAY_400, TOKENS.white),
        );
        expect(contrastRatio(REPLACED_GRAY_400, TOKENS.white)).toBeLessThan(AA_NORMAL);
    });

    it('improves low-stock warning legibility by replacing amber-600 with the darker --state-warning', () => {
        // --state-warning is the warm urgency value (#b54a2a): strictly darker (higher contrast on
        // white) than the amber-600 it replaced, which itself fails normal AA.
        expect(relativeLuminance(TOKENS.stateWarning)).toBeLessThan(relativeLuminance(REPLACED_AMBER_600));
        expect(contrastRatio(TOKENS.stateWarning, TOKENS.white)).toBeGreaterThan(
            contrastRatio(REPLACED_AMBER_600, TOKENS.white),
        );
        expect(contrastRatio(REPLACED_AMBER_600, TOKENS.white)).toBeLessThan(AA_NORMAL);
    });
});
