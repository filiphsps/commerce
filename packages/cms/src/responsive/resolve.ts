import { BREAKPOINTS, type Breakpoint } from './breakpoints';
import type { ResponsiveValue } from './types';

/**
 * Coerce loosely-typed stored data into a {@link ResponsiveValue}. Accepts a
 * partial breakpoint map, a bare scalar (legacy single-value content authored
 * before a field went responsive), or nullish — always producing a value with a
 * defined `base`.
 *
 * @param raw - Stored value: a breakpoint map, a scalar, or nullish.
 * @param fallbackBase - The base used when `raw` supplies none.
 * @returns A normalized responsive value.
 */
export const normalizeResponsiveValue = <T>(raw: unknown, fallbackBase: T): ResponsiveValue<T> => {
    if (raw == null) return { base: fallbackBase };
    if (typeof raw !== 'object') return { base: raw as T };

    const map = raw as Partial<Record<Breakpoint, T>>;
    const result: ResponsiveValue<T> = { base: (map.base ?? fallbackBase) as T };
    for (const breakpoint of BREAKPOINTS) {
        if (breakpoint === 'base') continue;
        const value = map[breakpoint];
        if (value !== undefined && value !== null) {
            (result as Record<Breakpoint, T>)[breakpoint] = value;
        }
    }
    return result;
};

/**
 * The defined `[breakpoint, value]` pairs of a responsive value, in ascending
 * breakpoint order — one entry per breakpoint the author explicitly set.
 *
 * @param value - The responsive value.
 * @returns The defined entries, ascending.
 */
export const responsiveEntries = <T>(value: ResponsiveValue<T>): Array<[Breakpoint, T]> =>
    BREAKPOINTS.filter((breakpoint) => value[breakpoint] !== undefined).map((breakpoint) => [
        breakpoint,
        value[breakpoint] as T,
    ]);

/**
 * The effective value at breakpoint `at`, cascading from the nearest defined
 * breakpoint at or below it (mobile-first).
 *
 * @param value - The responsive value.
 * @param at - The breakpoint to resolve at.
 * @returns The effective value at `at`.
 */
export const resolveResponsiveValue = <T>(value: ResponsiveValue<T>, at: Breakpoint): T => {
    let resolved = value.base;
    for (const breakpoint of BREAKPOINTS) {
        const candidate = value[breakpoint];
        if (candidate !== undefined) resolved = candidate as T;
        if (breakpoint === at) break;
    }
    return resolved;
};

/**
 * Build a className from a responsive value and a per-breakpoint, per-value
 * lookup of literal Tailwind classes. One class is emitted per breakpoint the
 * author defined; CSS's cascade (later breakpoint variants win) handles the rest.
 *
 * The lookup must hold static literal class strings so Tailwind's scanner emits
 * them — never assemble the breakpoint prefixes dynamically.
 *
 * @param value - The responsive value.
 * @param table - `table[breakpoint][value]` → the literal (prefixed) class set.
 * @returns The space-joined className.
 */
export const responsiveClassName = <T extends string>(
    value: ResponsiveValue<T>,
    table: Record<Breakpoint, Record<T, string>>,
): string =>
    responsiveEntries(value)
        .map(([breakpoint, entry]) => table[breakpoint][entry])
        .join(' ');
