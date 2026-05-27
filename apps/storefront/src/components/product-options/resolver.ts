import type { Product, ProductVariant } from '@/api/product';
import type { ProductOptionsSelectorProps } from '@/components/product-options-selector';
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

function* iterValues(option: RawOption): Generator<{ name: string; swatch?: RawSwatch }> {
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

export function toSelectionRecord(variant: ProductVariant | undefined): Record<string, string> {
    if (!variant) return {};
    return Object.fromEntries((variant.selectedOptions ?? []).map((so) => [so.name, so.value]));
}

type LegacyOptionShape = ProductOptionsSelectorProps['options'];

/**
 * @deprecated Adapter for the legacy ProductOptionsSelector. Migrate consumers
 * to <ProductOptions.Group/Value> primitives and remove this function.
 */
export function resolvedToLegacyOptions(resolved: ResolvedOption[]): LegacyOptionShape {
    return resolved.map((opt) => ({
        name: opt.name,
        optionValues: opt.values.map((v) => {
            const selectedOptions = v.variant?.selectedOptions ?? [];
            const variantUriQuery =
                selectedOptions.length > 0
                    ? new URLSearchParams(
                          selectedOptions.reduce<Record<string, string>>((acc, so) => {
                              acc[so.name] = so.value;
                              return acc;
                          }, {}),
                      ).toString()
                    : undefined;

            return {
                name: v.name,
                available: v.available,
                exists: v.variant !== undefined,
                selected: v.selected,
                isDifferentProduct: false,
                variantUriQuery,
                variant: {
                    id: v.variant?.id,
                    weight: v.variant?.weight ?? null,
                    weightUnit: v.variant?.weightUnit ?? null,
                },
                swatch: v.swatch
                    ? {
                          color: v.swatch.color,
                          image: v.swatch.image
                              ? {
                                    previewImage: {
                                        url: v.swatch.image.url,
                                        altText: v.swatch.image.altText ?? undefined,
                                        width: v.swatch.image.width,
                                        height: v.swatch.image.height,
                                    },
                                }
                              : undefined,
                      }
                    : undefined,
            };
        }),
    })) as LegacyOptionShape;
}
