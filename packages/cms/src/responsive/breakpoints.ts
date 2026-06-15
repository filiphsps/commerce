/**
 * The ordered, mobile-first breakpoint scale shared by the CMS editor and the
 * storefront. Mirrors the storefront Tailwind theme tokens (`--breakpoint-*`):
 * `base` is the unprefixed mobile default and every later entry overrides upward
 * from its min width (the Tailwind cascade).
 */
export const BREAKPOINTS = ['base', 'sm', 'md', 'lg', 'xl', '2xl'] as const;

/** One of the {@link BREAKPOINTS}. */
export type Breakpoint = (typeof BREAKPOINTS)[number];

/** Every breakpoint except the mandatory mobile-first `base`. */
export type DerivedBreakpoint = Exclude<Breakpoint, 'base'>;

/**
 * A human-facing device preset for one breakpoint: the friendly name shown in
 * the editor, the underlying Tailwind breakpoint key, and its min viewport
 * width in CSS pixels (kept in sync with the storefront theme tokens).
 */
export type BreakpointPreset = {
    breakpoint: Breakpoint;
    /** Human-readable device label surfaced in the editor (e.g. "Tablet"). */
    label: string;
    /** Lower bound of the breakpoint in CSS pixels. */
    minWidth: number;
};

/**
 * Device presets surfaced in the editor's "add breakpoint" dropdown, ordered by
 * width. Labels are device-named on purpose so an editor picks "Tablet" instead
 * of memorizing that it maps to `md`.
 */
export const BREAKPOINT_PRESETS: readonly BreakpointPreset[] = [
    { breakpoint: 'base', label: 'Mobile', minWidth: 0 },
    { breakpoint: 'sm', label: 'Large phone', minWidth: 640 },
    { breakpoint: 'md', label: 'Tablet', minWidth: 768 },
    { breakpoint: 'lg', label: 'Laptop', minWidth: 1024 },
    { breakpoint: 'xl', label: 'Desktop', minWidth: 1280 },
    { breakpoint: '2xl', label: 'Wide', minWidth: 1536 },
] as const;

const PRESET_BY_BREAKPOINT = new Map(BREAKPOINT_PRESETS.map((preset) => [preset.breakpoint, preset]));

/**
 * The human-readable device label for a breakpoint (e.g. `md` → "Tablet").
 *
 * @param breakpoint - The breakpoint key.
 * @returns The device label, or the raw key when unknown.
 */
export const breakpointLabel = (breakpoint: Breakpoint): string =>
    PRESET_BY_BREAKPOINT.get(breakpoint)?.label ?? breakpoint;

/**
 * The Tailwind variant prefix for a breakpoint (`base` → `''`, `md` → `'md:'`).
 *
 * @param breakpoint - The breakpoint key.
 * @returns The variant prefix, empty for `base`.
 */
export const breakpointPrefix = (breakpoint: Breakpoint): string => (breakpoint === 'base' ? '' : `${breakpoint}:`);

/**
 * Type guard for {@link Breakpoint}.
 *
 * @param value - Any value.
 * @returns `true` when `value` is a known breakpoint key.
 */
export const isBreakpoint = (value: unknown): value is Breakpoint =>
    typeof value === 'string' && (BREAKPOINTS as readonly string[]).includes(value);
