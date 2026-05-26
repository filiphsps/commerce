import type { Product, ProductVariant } from '@/api/product';
import type { ResolvedOption, ResolvedOptionValue, ResolvedSwatch } from './types';

function normalizeSwatch(raw: any): ResolvedSwatch | undefined {
    if (!raw) return undefined;
    const previewUrl = raw.image?.previewImage?.url ?? raw.image?.url;
    return {
        color: raw.color ?? undefined,
        image: previewUrl
            ? {
                  url: previewUrl,
                  altText: raw.image?.previewImage?.altText ?? raw.image?.altText ?? null,
                  width: raw.image?.previewImage?.width ?? raw.image?.width,
                  height: raw.image?.previewImage?.height ?? raw.image?.height,
              }
            : undefined,
    };
}

function* iterValues(option: any): Generator<{ name: string; swatch?: any }> {
    if (Array.isArray(option.optionValues) && option.optionValues.length > 0) {
        for (const ov of option.optionValues) yield { name: ov.name, swatch: ov.swatch };
        return;
    }
    if (Array.isArray(option.values)) {
        for (const v of option.values) yield { name: v };
    }
}

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

export function resolveOptions(product: Product, selection: Record<string, string>): ResolvedOption[] {
    return (product.options ?? [])
        .filter((o: any) => o.name && o.name.toLowerCase() !== 'title')
        .map((option: any) => ({
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

export function toSelectionRecord(variant: ProductVariant | undefined): Record<string, string> {
    if (!variant) return {};
    return Object.fromEntries((variant.selectedOptions ?? []).map((so) => [so.name, so.value]));
}
