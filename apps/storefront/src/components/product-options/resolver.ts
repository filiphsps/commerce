import type { Product, ProductVariant } from '@/api/product';
import type { ResolvedOption, ResolvedOptionValue, ResolvedSwatch } from './types';

type RawImage = {
    url?: string;
    altText?: string | null;
    width?: number;
    height?: number;
};

type RawSwatch = {
    color?: string;
    image?:
        | (RawImage & {
              previewImage?: RawImage;
              image?: RawImage;
          })
        | null;
} | null;

type RawOptionValue = { name: string; swatch?: RawSwatch };

type RawOption = {
    name: string;
    optionValues?: RawOptionValue[];
    values?: string[];
};

/**
 * Normalizes a raw Shopify swatch shape into the internal `ResolvedSwatch` format.
 *
 * @param raw - Raw swatch data from Shopify with optional color and nested image references.
 * @returns A normalized swatch object, or `undefined` when neither a color nor an image URL is present.
 */
function normalizeSwatch(raw: RawSwatch | undefined): ResolvedSwatch | undefined {
    if (!raw) return undefined;
    const previewUrl = raw.image?.previewImage?.url ?? raw.image?.image?.url ?? raw.image?.url;
    const color = raw.color ?? undefined;
    const image = previewUrl
        ? {
              url: previewUrl,
              altText: raw.image?.previewImage?.altText ?? raw.image?.image?.altText ?? raw.image?.altText ?? null,
              width: raw.image?.previewImage?.width ?? raw.image?.image?.width ?? raw.image?.width,
              height: raw.image?.previewImage?.height ?? raw.image?.image?.height ?? raw.image?.height,
          }
        : undefined;
    if (!color && !image) return undefined;
    return { color, image };
}

/**
 * Yields each option value from either the `optionValues` or legacy `values` array.
 *
 * @param option - Raw product option containing either `optionValues` (new) or `values` (legacy) entries.
 * @returns A generator of `{ name, swatch? }` entries.
 */
function* iterValues(option: RawOption): Generator<{ name: string; swatch?: RawSwatch }> {
    if (Array.isArray(option.optionValues) && option.optionValues.length > 0) {
        for (const ov of option.optionValues) yield { name: ov.name, swatch: ov.swatch };
        return;
    }
    if (Array.isArray(option.values)) {
        for (const v of option.values) yield { name: v };
    }
}

/**
 * Returns the first product variant whose selected options exactly match the given selection map.
 *
 * @param product - Product providing the variant list.
 * @param selection - Map of option name to value representing the current selection.
 * @returns The matching variant, or `undefined` when no variant matches the full selection.
 */
export function findVariant(product: Product, selection: Record<string, string>): ProductVariant | undefined {
    const edges = product.variants?.edges ?? [];
    return edges
        .map((e) => e.node)
        .find(
            (v) =>
                v.selectedOptions.every((so) => selection[so.name] === so.value) &&
                v.selectedOptions.length === Object.keys(selection).length,
        );
}

/**
 * Determines whether a given option value is available for sale given the current selection.
 *
 * @param product - Product providing the full variant list.
 * @param optionName - Name of the option being evaluated.
 * @param valueName - Specific option value to check for availability.
 * @param selection - Current selection map used to filter compatible variants.
 * @returns `true` when at least one variant with this option value and matching selection is available for sale.
 */
function deriveAvailability(
    product: Product,
    optionName: string,
    valueName: string,
    selection: Record<string, string>,
): boolean {
    const variants = (product.variants?.edges ?? []).map((e) => e.node);
    return variants.some((v) => {
        if (!v.selectedOptions.some((so) => so.name === optionName && so.value === valueName)) return false;
        const otherPicksOk = Object.entries(selection)
            .filter(([k]) => k !== optionName)
            .every(([k, val]) => v.selectedOptions.some((so) => so.name === k && so.value === val));
        if (!otherPicksOk) return false;
        return v.availableForSale === true;
    });
}

/**
 * Resolves all meaningful product options into a display-ready structure with selected and availability state.
 *
 * @param product - Product whose options and variants are resolved.
 * @param selection - Current selection map used to compute per-value selected and available flags.
 * @returns Array of resolved option groups, excluding the default `'title'` option.
 */
export function resolveOptions(product: Product, selection: Record<string, string>): ResolvedOption[] {
    const options = (product.options ?? []) as unknown as RawOption[];
    return options
        .filter((o) => o.name && o.name.toLowerCase() !== 'title')
        .map((option) => ({
            name: option.name,
            values: Array.from(iterValues(option)).map<ResolvedOptionValue>((v) => ({
                name: v.name,
                selected: selection[option.name] === v.name,
                available: deriveAvailability(product, option.name, v.name, selection),
                swatch: normalizeSwatch(v.swatch),
                variant: findVariant(product, { ...selection, [option.name]: v.name }),
            })),
        }));
}

/**
 * Converts a variant's selected options array into a flat option-name-to-value map.
 *
 * @param variant - Variant whose `selectedOptions` are flattened into a record.
 * @returns A record mapping option names to their selected values, or an empty object when `variant` is undefined.
 */
export function toSelectionRecord(variant: ProductVariant | undefined): Record<string, string> {
    if (!variant) return {};
    return Object.fromEntries((variant.selectedOptions ?? []).map((so) => [so.name, so.value]));
}
