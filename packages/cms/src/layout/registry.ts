import { TypeError } from '@nordcom/commerce-errors';

/**
 * Canonical, ordered identifier set for the chrome layout surface — the single source of truth for
 * "which chrome slots exist" that the storefront's `ShopLayout` slot host consumes. The order here is
 * the platform DEFAULT composition and MUST equal the historically hardcoded chrome order
 * (`info-bar → header → content → footer`), so an un-customized shop renders byte-identically.
 *
 * Kept CMS-safe on purpose: this module pulls in only the errors package — never React, Shopify, the
 * db package, or storefront code — so the block-loader firewall stays intact when the storefront
 * imports it at runtime. Section visibility (P3-6 flags) and the concrete slot components are
 * injected by the storefront at the render boundary; this module owns only the ordered id list.
 */
export const CHROME_SLOT_IDS = ['info-bar', 'header', 'content', 'footer'] as const;

/**
 * Discriminant union of every chrome slot id, derived from {@link CHROME_SLOT_IDS}. Used as the
 * exhaustive key set for the storefront's chrome slot registry.
 */
export type ChromeSlotId = (typeof CHROME_SLOT_IDS)[number];

/**
 * The chrome's page-content outlet. Non-removable: it hosts the route's page tree, so a resolved
 * composition always contains it and it can never be toggled off, regardless of override or flag.
 */
export const CHROME_CONTENT_SLOT_ID: ChromeSlotId = 'content';

/**
 * A route-type layout surface: its byte-identical default section order plus the subset of sections
 * that can never be removed or hidden. One surface is registered today — {@link CHROME_SURFACE}.
 * Templates whose composition is driven by Next.js filesystem conventions (e.g. the PDP's `@gallery`/
 * `@description`/`@details`/`@recommendations` parallel routes) are intentionally NOT modeled here:
 * the router resolves and data-fetches those slots from the URL segments regardless of where the
 * layout places them, so slot-driving them would break router-managed data fetching. They remain
 * code-defined (see the P4-2 follow-up notes).
 */
export type LayoutSurface<TId extends string> = {
    /** Stable surface identifier (used in error messages). */
    readonly id: string;
    /** Default, byte-identical section order for the surface. */
    readonly defaultOrder: readonly TId[];
    /** Sections that must always render — never dropped by an override order nor a visibility flag. */
    readonly required: readonly TId[];
};

/**
 * The chrome surface backing the storefront `ShopLayout`: info-bar/header/content/footer in their
 * historical order, with `content` non-removable.
 */
export const CHROME_SURFACE: LayoutSurface<ChromeSlotId> = {
    id: 'chrome',
    defaultOrder: CHROME_SLOT_IDS,
    required: [CHROME_CONTENT_SLOT_ID],
};

/** Inputs to {@link resolveLayout} / {@link resolveChromeLayout}; both fields are opt-in. */
export type ResolveLayoutInput<TId extends string> = {
    /**
     * Opt-in per-shop override order. Nullish or empty → the surface default is used verbatim, which
     * keeps an un-customized shop byte-identical. When provided, every id must be a declared section
     * of the surface, ids must be unique, and all required sections must be present.
     */
    order?: readonly string[] | null;
    /**
     * Visibility predicate — e.g. the P3-6 `section:<id>` feature flags. Returns `false` to hide a
     * non-required section. Required sections bypass it. Omitted → every section is visible (the
     * byte-identical default, matching today's unconditionally-rendered chrome).
     */
    isVisible?: (id: TId) => boolean;
};

/**
 * Resolves a layout surface to its final, ordered, visible section id list.
 *
 * Default path (no `order`, no `isVisible`): returns `surface.defaultOrder` unchanged, so an
 * un-customized shop is byte-identical to the historical hardcoded composition.
 *
 * Override path: `order` reorders/toggles sections (only ids declared in `surface.defaultOrder` are
 * valid, ids must be unique, and every `surface.required` id must be present); `isVisible` then hides
 * any non-required section it rejects.
 *
 * @param surface - The layout surface descriptor (default order + required sections).
 * @param input - Optional override order and visibility predicate.
 * @returns The ordered, visible section ids to render.
 * @throws {TypeError} When `order` references an unknown id, repeats an id, or omits a required id.
 */
export function resolveLayout<TId extends string>(
    surface: LayoutSurface<TId>,
    { order, isVisible }: ResolveLayoutInput<TId> = {},
): TId[] {
    const known = new Set<string>(surface.defaultOrder);
    const requiredSet = new Set<string>(surface.required);

    let source: readonly TId[];
    if (!order || order.length === 0) {
        source = surface.defaultOrder;
    } else {
        const seen = new Set<string>();
        for (const id of order) {
            if (!known.has(id)) {
                throw new TypeError(`Unknown "${surface.id}" layout section "${id}".`);
            }
            if (seen.has(id)) {
                throw new TypeError(`Duplicate "${surface.id}" layout section "${id}".`);
            }
            seen.add(id);
        }
        for (const id of requiredSet) {
            if (!seen.has(id)) {
                throw new TypeError(`The "${surface.id}" layout must include the required section "${id}".`);
            }
        }
        // Every id is now a validated member of `surface.defaultOrder`, so the narrowing is sound.
        source = order as readonly TId[];
    }

    if (!isVisible) {
        return [...source];
    }
    return source.filter((id) => requiredSet.has(id) || isVisible(id));
}

/**
 * Resolves the chrome surface to its ordered, visible slot ids — the composition the storefront
 * `ShopLayout` renders. Thin wrapper over {@link resolveLayout} bound to {@link CHROME_SURFACE}.
 *
 * @param input - Optional override order and visibility predicate (e.g. P3-6 section flags).
 * @returns The ordered, visible chrome slot ids; defaults to {@link CHROME_SLOT_IDS} unchanged.
 * @throws {TypeError} When an override references an unknown slot, repeats a slot, or omits `content`.
 */
export function resolveChromeLayout(input: ResolveLayoutInput<ChromeSlotId> = {}): ChromeSlotId[] {
    return resolveLayout(CHROME_SURFACE, input);
}
