import type { DerivedBreakpoint } from './breakpoints';

/**
 * A value that can vary per breakpoint. `base` is the required mobile-first
 * default; any higher breakpoint overrides it from that width up (the Tailwind
 * cascade). Omitted breakpoints inherit the nearest defined one below them.
 *
 * @example
 *   const layout: ResponsiveValue<'grid' | 'carousel'> = { base: 'carousel', md: 'grid' };
 */
export type ResponsiveValue<T> = { base: T } & Partial<Record<DerivedBreakpoint, T>>;
