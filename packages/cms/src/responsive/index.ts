/**
 * Generic, framework-agnostic primitives for values that vary by breakpoint.
 * Shared by the CMS editor (per-breakpoint field editing) and the storefront
 * (resolving a stored {@link ResponsiveValue} into Tailwind classes). No React
 * and no Tailwind hardcoding beyond the prefix the consumer supplies — reusable
 * anywhere a responsive value is needed.
 */
export {
    BREAKPOINT_PRESETS,
    BREAKPOINTS,
    type Breakpoint,
    type BreakpointPreset,
    breakpointLabel,
    breakpointPrefix,
    type DerivedBreakpoint,
    isBreakpoint,
} from './breakpoints';
export { normalizeResponsiveValue, resolveResponsiveValue, responsiveClassName, responsiveEntries } from './resolve';
export type { ResponsiveValue } from './types';
