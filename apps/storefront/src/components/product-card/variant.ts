export type ProductCardVariant = 'vertical-boxed' | 'vertical-bare' | 'horizontal-boxed' | 'horizontal-bare' | 'micro';

export const ALL_VARIANTS: ReadonlyArray<ProductCardVariant> = [
    'vertical-boxed',
    'vertical-bare',
    'horizontal-boxed',
    'horizontal-bare',
    'micro',
] as const;

export const DEFAULT_VARIANT: ProductCardVariant = 'vertical-boxed';

export function resolveVariant(input: string | undefined): ProductCardVariant {
    if (input && (ALL_VARIANTS as ReadonlyArray<string>).includes(input)) {
        return input as ProductCardVariant;
    }
    return DEFAULT_VARIANT;
}
