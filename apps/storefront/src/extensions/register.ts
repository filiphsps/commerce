'use client';

import { registerProductCardCta } from '@/components/product-card/cta/registry';
import type { ProductCardCtaComponent } from '@/components/product-card/cta/types';
import { registerProductCardPicker } from '@/components/product-card/picker/registry';
import type { ProductCardPickerComponent } from '@/components/product-card/picker/types';

/**
 * The storefront-side component registration contract a future extension package fulfills at boot. It
 * pairs the CMS-safe, declarative `ShopExtensionManifest` (which carries only variant *names*) with the
 * concrete, statically-imported React components those names resolve to. Keys are the names a manifest
 * references via `ProductCardVariantSelection.pickerPresentation` / `.ctaPlacement`.
 *
 * @example
 * ```ts
 * import { registerExtensionComponents, type ExtensionComponentRegistration } from '@/extensions/register';
 * import CarouselPicker from './carousel-picker';
 * const registration: ExtensionComponentRegistration = { pickers: { carousel: CarouselPicker } };
 * registerExtensionComponents(registration);
 * ```
 */
export type ExtensionComponentRegistration = {
    /** Named picker components registered under the storefront picker registry. */
    pickers?: Readonly<Record<string, ProductCardPickerComponent>>;
    /** Named CTA components registered under the storefront CTA registry. */
    ctas?: Readonly<Record<string, ProductCardCtaComponent>>;
};

/**
 * Register-at-boot wiring: registers an extension's product-card variant components against the
 * platform's pre-existing variant registries via their public `register*` entrypoints
 * (`registerProductCardPicker` / `registerProductCardCta`). This is the concrete contract a future
 * extension package calls; a manifest then selects these names through its `productCard` field and the
 * storefront resolves them at the render boundary. An empty registration is a no-op, so the built-in
 * defaults stay intact and an un-customized shop is unchanged.
 *
 * SCOPE / DEFERRED — this wires only LOCAL, statically-imported, in-repo components. It deliberately
 * does NOT load or execute untrusted third-party code or remote assets: the live third-party extension
 * CODE sandbox / dynamic asset loader is a separate security project, explicitly deferred and layered
 * on the Block-loader firewall (see CONTEXT.md "Extension code sandbox" and the note in
 * `@nordcom/commerce-cms/extensions` `resolveExtensions`). Blocks and chrome slots have no runtime
 * register API — they are compile-time-exhaustive records — so extending them is a code change to the
 * shared `BLOCK_TYPES` / `CHROME_SLOT_IDS` and their storefront maps, not a boot-time registration.
 *
 * @param registration - The picker/CTA components to register, keyed by their manifest-referenced name.
 */
export function registerExtensionComponents(registration: ExtensionComponentRegistration): void {
    const { pickers, ctas } = registration;

    if (pickers) {
        for (const [name, component] of Object.entries(pickers)) {
            registerProductCardPicker(name, component);
        }
    }

    if (ctas) {
        for (const [name, component] of Object.entries(ctas)) {
            registerProductCardCta(name, component);
        }
    }
}
