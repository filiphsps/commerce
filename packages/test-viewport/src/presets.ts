/**
 * Shared viewport presets for responsive testing across every app and package.
 *
 * The width thresholds that map a preset to a {@link Breakpoint} mirror the
 * mobile-first scale used by `@nordcom/commerce-cms/responsive` (and Tailwind's
 * defaults): base, sm 640, md 768, lg 1024, xl 1280, 2xl 1536. They are
 * re-declared here rather than imported so this package stays dependency-free
 * and usable from any consumer — keep the two in sync if the scale ever moves.
 */

/** Mobile-first breakpoint names, ascending by min-width. */
export type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Ascending min-width (px) at which each breakpoint becomes active. */
export const BREAKPOINT_MIN_WIDTH: Readonly<Record<Breakpoint, number>> = {
    base: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
} as const;

/** A named device viewport used to drive unit and e2e responsive checks. */
export type ViewportPreset = {
    /** Stable id; used verbatim in test titles and Playwright project names. */
    id: string;
    /** Human-readable device label. */
    label: string;
    /** CSS viewport width in px. */
    width: number;
    /** CSS viewport height in px. */
    height: number;
    /** Device pixel ratio. */
    deviceScaleFactor: number;
    /** Touch-primary device (drives Playwright `isMobile`/`hasTouch`). */
    touch: boolean;
    /** The breakpoint this width resolves to, for assertion convenience. */
    breakpoint: Breakpoint;
    /** Foldable form factor (hinge / unusual aspect) — flagged for targeted assertions. */
    foldable?: boolean;
};

/**
 * Resolves a CSS pixel width to its mobile-first breakpoint name.
 *
 * @param width - Viewport width in px.
 * @returns The active {@link Breakpoint} for that width.
 */
export function breakpointForWidth(width: number): Breakpoint {
    if (width >= BREAKPOINT_MIN_WIDTH['2xl']) return '2xl';
    if (width >= BREAKPOINT_MIN_WIDTH.xl) return 'xl';
    if (width >= BREAKPOINT_MIN_WIDTH.lg) return 'lg';
    if (width >= BREAKPOINT_MIN_WIDTH.md) return 'md';
    if (width >= BREAKPOINT_MIN_WIDTH.sm) return 'sm';
    return 'base';
}

/**
 * Builds a preset, deriving its breakpoint from the width so a preset and its
 * declared breakpoint can never drift apart.
 *
 * @param fields - Preset fields minus the derived `breakpoint`.
 * @returns The complete {@link ViewportPreset}.
 */
function preset(fields: Omit<ViewportPreset, 'breakpoint'>): ViewportPreset {
    return { ...fields, breakpoint: breakpointForWidth(fields.width) };
}

/** Narrowest realistic phone — iPhone SE; the floor for "no horizontal overflow" checks. */
export const MOBILE_SMALL = preset({
    id: 'mobile-small',
    label: 'Mobile (small)',
    width: 320,
    height: 568,
    deviceScaleFactor: 2,
    touch: true,
});

/** Modern mid-size phone — iPhone 12/13/14 class. */
export const MOBILE = preset({
    id: 'mobile',
    label: 'Mobile',
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    touch: true,
});

/** Cover screen of a folded book-style foldable (Galaxy Z Fold) — extreme narrow stress. */
export const FOLDABLE_FOLDED = preset({
    id: 'foldable-folded',
    label: 'Foldable (folded)',
    width: 280,
    height: 653,
    deviceScaleFactor: 3,
    touch: true,
    foldable: true,
});

/** Inner screen of an unfolded book-style foldable — square-ish, lands in `md`. */
export const FOLDABLE_UNFOLDED = preset({
    id: 'foldable-unfolded',
    label: 'Foldable (unfolded)',
    width: 884,
    height: 1104,
    deviceScaleFactor: 2,
    touch: true,
    foldable: true,
});

/** Tablet portrait — iPad class; the lower edge of `md`. */
export const TABLET_PORTRAIT = preset({
    id: 'tablet-portrait',
    label: 'Tablet (portrait)',
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    touch: true,
});

/** Tablet landscape — the boundary where the editor flips to side-by-side (`lg`). */
export const TABLET_LANDSCAPE = preset({
    id: 'tablet-landscape',
    label: 'Tablet (landscape)',
    width: 1024,
    height: 768,
    deviceScaleFactor: 2,
    touch: true,
});

/** Laptop — common 1280-wide notebook; first `xl` desktop tier. */
export const LAPTOP = preset({
    id: 'laptop',
    label: 'Laptop',
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    touch: false,
});

/** Desktop — 1440 design width. */
export const DESKTOP = preset({
    id: 'desktop',
    label: 'Desktop',
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    touch: false,
});

/** Wide / large desktop — `2xl`. */
export const WIDE = preset({
    id: 'wide',
    label: 'Wide',
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    touch: false,
});

/** Every preset, ascending by width. */
export const VIEWPORT_PRESETS: readonly ViewportPreset[] = [
    FOLDABLE_FOLDED,
    MOBILE_SMALL,
    MOBILE,
    TABLET_PORTRAIT,
    FOLDABLE_UNFOLDED,
    TABLET_LANDSCAPE,
    LAPTOP,
    DESKTOP,
    WIDE,
] as const;

/** Presets indexed by id for direct lookup. */
export const VIEWPORT_PRESETS_BY_ID: Readonly<Record<string, ViewportPreset>> = Object.fromEntries(
    VIEWPORT_PRESETS.map((p) => [p.id, p]),
);

/**
 * A compact, opinionated matrix for app-level e2e: one device per visually
 * distinct tier (folded foldable, phone, tablet, side-by-side desktop) so the
 * device fan-out stays cheap while still covering every layout branch.
 */
export const CORE_RESPONSIVE_MATRIX: readonly ViewportPreset[] = [
    FOLDABLE_FOLDED,
    MOBILE,
    TABLET_PORTRAIT,
    DESKTOP,
] as const;
