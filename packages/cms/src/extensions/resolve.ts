import { type ResolvedShopTheme, resolveTheme, type ThemeResolutionInput } from '@nordcom/commerce-db/lib/theme';
import { TypeError } from '@nordcom/commerce-errors';
import { BLOCK_TYPES, type BlockType, isBlockType } from '../blocks/registry';
import { type ChromeSlotId, resolveChromeLayout } from '../layout/registry';
import type { ProductCardVariantSelection, ShopExtensionManifest } from './manifest';

/**
 * Input to {@link resolveExtensions}. Tenant context is explicit — `shop` is required and never
 * implied — matching the platform's "every data path carries `{ shop }`" invariant.
 */
export type ResolveExtensionsInput = {
    /**
     * The shop record (or any {@link ThemeResolutionInput}-shaped object) supplying the theme override
     * source (`theme`) and the accent fallback source (`design.accents`). Required.
     */
    shop: ThemeResolutionInput;
    /**
     * The shop's optional extension manifest. Absent, `null`, or empty → the resolved config is
     * byte-identical to today's render.
     */
    manifest?: ShopExtensionManifest | null;
    /**
     * Render-boundary section-visibility predicate, injected by the caller (the storefront passes its
     * `sectionEnabled(id).evaluate(shop)`), so this CMS-safe resolver never evaluates feature flags
     * itself — flag evaluation stays behind the firewall on the storefront side. Returns whether a
     * section is visible *before* the manifest's explicit overrides apply. Omitted → every section is
     * visible (today's unconditionally-rendered default).
     */
    isSectionVisible?: (sectionId: string) => boolean;
};

/**
 * The unified, fully-resolved per-shop composition produced by {@link resolveExtensions}. Each field is
 * the output of the corresponding pre-existing resolver after the manifest has been composed in; with
 * an absent/empty manifest every field equals today's resolved value.
 */
export type ResolvedExtensions = {
    /** Fully-populated theme tokens (from `resolveTheme`). */
    theme: ResolvedShopTheme;
    /** Ordered, visible chrome slot ids (from `resolveChromeLayout`). */
    chrome: ChromeSlotId[];
    /**
     * Composed section-visibility predicate: a manifest `sections` entry wins when present, otherwise
     * the injected render-boundary predicate decides (defaulting to visible). This is the predicate the
     * storefront feeds back into chrome/section rendering.
     */
    isSectionEnabled: (sectionId: string) => boolean;
    /** Block availability resolved against the canonical `BLOCK_TYPES`. */
    blocks: {
        /** The block types this shop exposes, in `BLOCK_TYPES` order. */
        available: BlockType[];
        /** Whether a raw block-type string is both a known block type and exposed by this shop. */
        isAvailable: (type: string) => boolean;
    };
    /**
     * Normalized per-surface product-card variant selections. The storefront completes resolution at
     * the render boundary via `resolveProductCardSurface` + the `register*` registries; this CMS-safe
     * resolver cannot import those `server-only` storefront modules without breaking the firewall.
     */
    productCard: Record<string, ProductCardVariantSelection>;
    /**
     * Normalized store-wide block default settings keyed by block slug. A block component reads its
     * slug's entry as the store default for its `settings` descriptors; an absent entry → platform
     * defaults. Empty when the manifest carries no block defaults.
     */
    blockDefaults: Record<string, Record<string, unknown>>;
};

/**
 * Pure per-shop composition: layers an optional {@link ShopExtensionManifest} onto the platform's
 * five existing resolvers and returns the unified {@link ResolvedExtensions}. It REUSES the existing
 * resolvers verbatim — `resolveTheme` (theme), `resolveChromeLayout` (chrome), the injected section
 * predicate (visibility), `BLOCK_TYPES` / `isBlockType` (block availability) — and never reimplements
 * their logic, so an absent, `null`, or empty manifest (with no injected predicate) composes to today's
 * resolved theme, chrome order, all-sections-visible, full block availability, and empty card-variant
 * overrides — byte-identically.
 *
 * Composition rules:
 * - **theme** — `manifest.theme` supersedes the stored `shop.theme` when present; both resolve through
 *   `resolveTheme` against `THEME_DEFAULTS`. (A deep-merge of the two layers is deliberately deferred to
 *   avoid forking `resolveTheme`'s private merge; `shop.theme` is absent on every existing shop today.)
 * - **chrome** — `manifest.chrome.order` and the composed section predicate pass straight into
 *   `resolveChromeLayout`, which owns order validation (and throws on an invalid order).
 * - **sections** — an explicit `manifest.sections[id]` boolean wins; otherwise the injected
 *   `isSectionVisible` decides; otherwise visible.
 * - **blocks** — `manifest.blocks.available` is filtered down to known `BLOCK_TYPES` (unknown ids are
 *   dropped gracefully, matching `isBlockType`'s forward-compatible degradation); absent → all types.
 * - **productCard** — selections are normalized (shallow-copied) and surfaced for the storefront to
 *   feed into its `server-only` surface/variant resolvers at the render boundary.
 * - **blockDefaults** — per-block-slug setting maps are normalized (shallow-copied) and surfaced for
 *   block components to read as their store default; absent → platform defaults.
 *
 * NOTE — deferred third-party code sandbox. This resolver composes *declarative data* only; it executes
 * no extension code and loads no remote assets. The future capability to load and run untrusted
 * third-party extension code/assets at runtime is a SEPARATE security project, explicitly deferred and
 * layered atop the Block-loader firewall (see CONTEXT.md "Extension code sandbox"). Component
 * registration today happens with statically-imported, in-repo components via the storefront's
 * `register*` entrypoints (e.g. `registerProductCardPicker` / `registerProductCardCta`) — never by
 * executing manifest-supplied code. Block and chrome dispatch are compile-time-exhaustive records, so
 * they have no runtime register API; adding a block or chrome slot is a code change to the shared
 * `BLOCK_TYPES` / `CHROME_SLOT_IDS` and their storefront maps.
 *
 * @param input - The shop, its optional manifest, and the optional render-boundary section predicate.
 * @returns The unified {@link ResolvedExtensions} composition.
 * @throws {TypeError} When `input` or `input.shop` is missing/not an object, or — via `resolveChromeLayout`
 *   — when `manifest.chrome.order` references an unknown slot, repeats one, or omits the required `content`.
 */
export function resolveExtensions(input: ResolveExtensionsInput): ResolvedExtensions {
    if (input === null || typeof input !== 'object') {
        throw new TypeError('resolveExtensions requires an input object');
    }
    const { shop, manifest, isSectionVisible } = input;
    if (shop === null || typeof shop !== 'object') {
        throw new TypeError('resolveExtensions requires a shop object');
    }

    const themeOverrides = manifest?.theme ?? shop.theme ?? undefined;
    const theme = resolveTheme({ design: shop.design, theme: themeOverrides });

    /**
     * Composed section-visibility decision: the manifest's explicit boolean wins, then the injected
     * render-boundary predicate, then the byte-identical default of visible.
     *
     * @param sectionId - Bare section id to evaluate.
     * @returns Whether the section should render.
     */
    const isSectionEnabled = (sectionId: string): boolean => {
        const override = manifest?.sections?.[sectionId];
        if (typeof override === 'boolean') {
            return override;
        }
        return isSectionVisible ? isSectionVisible(sectionId) : true;
    };

    const chrome = resolveChromeLayout({
        order: manifest?.chrome?.order,
        isVisible: (id) => isSectionEnabled(id),
    });

    const requestedBlocks = manifest?.blocks?.available;
    const available: BlockType[] = requestedBlocks
        ? requestedBlocks.filter((value): value is BlockType => isBlockType(value))
        : [...BLOCK_TYPES];
    const availableSet: ReadonlySet<BlockType> = new Set(available);

    /**
     * Whether a raw block-type string is a known block type AND exposed by this shop's manifest.
     *
     * @param type - Raw `blockType` discriminant from a CMS block node.
     * @returns `true` when the type is rendered for this shop.
     */
    const isBlockAvailable = (type: string): boolean => isBlockType(type) && availableSet.has(type);

    const productCard: Record<string, ProductCardVariantSelection> = {};
    if (manifest?.productCard) {
        for (const [surface, selection] of Object.entries(manifest.productCard)) {
            productCard[surface] = { ...selection };
        }
    }

    const blockDefaults: Record<string, Record<string, unknown>> = {};
    if (manifest?.blockDefaults) {
        for (const [slug, settings] of Object.entries(manifest.blockDefaults)) {
            blockDefaults[slug] = { ...settings };
        }
    }

    return {
        theme,
        chrome,
        isSectionEnabled,
        blocks: { available, isAvailable: isBlockAvailable },
        productCard,
        blockDefaults,
    };
}
