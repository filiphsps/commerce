/**
 * A single entry in the generated payment-brand icon manifest. Pairs the
 * slug and component name used at import time with the human-readable title
 * and the full list of alias strings that map to this icon.
 *
 * @example
 * ```ts
 * import type { IconManifestEntry } from 'react-payment-brand-icons';
 * import { manifest } from 'react-payment-brand-icons';
 *
 * const entry: IconManifestEntry = manifest.find((e) => e.slug === 'visa')!;
 * console.log(entry.componentName); // 'Visa'
 * ```
 */
export type IconManifestEntry = {
    slug: string;
    componentName: string;
    title: string;
    aliases: readonly string[];
};
