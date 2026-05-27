import type { Product } from '@/api/product';
import { mockProduct } from '@/utils/test/fixtures';

const COLORS = [
    'Salt Black',
    'Sweet Brown',
    'Caramel Glaze',
    'Apple Sour',
    'Wild Strawberry',
    'Pear Drop',
    'Cherry Rose',
    'Banana Yellow',
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

/**
 * Creates a single variant node for the multi-option product fixture.
 *
 * @param color - Color option value.
 * @param size - Size option value.
 * @param index - Variant index used to generate a unique Shopify GID.
 * @returns A minimal variant object with selected options and a fixed price.
 */
const makeVariant = (color: string, size: string, index: number) => ({
    id: `gid://shopify/ProductVariant/${index}`,
    title: `${color} / ${size}`,
    availableForSale: true,
    selectedOptions: [
        { name: 'Color', value: color },
        { name: 'Size', value: size },
    ],
    product: { handle: 'multi-option' },
    price: { amount: '9.99', currencyCode: 'USD' },
});

const firstVariant = makeVariant(COLORS[0]!, SIZES[0]!, 0);

// Encoded existence/availability: encode every cartesian (Color, Size) pair as existing+available.
// Pattern is the v1 trie: per Color index 0..7 → range of Size indices 0-5.
const ENCODED = `v1_${COLORS.map((_, c) => `${c}:0-${SIZES.length - 1}`).join(',')}`;

/** Returns a mock `Product` with eight colors and six sizes, producing a full cartesian variant matrix. */
export const productMultiOption = (): Product =>
    mockProduct({
        id: 'gid://shopify/Product/3',
        handle: 'multi-option',
        title: 'Multi-Option Candy',
        encodedVariantExistence: ENCODED,
        encodedVariantAvailability: ENCODED,
        options: [
            {
                id: 'opt-color',
                name: 'Color',
                optionValues: COLORS.map((color, i) => ({
                    name: color,
                    firstSelectableVariant: makeVariant(color, SIZES[0]!, i * SIZES.length),
                })),
            },
            {
                id: 'opt-size',
                name: 'Size',
                optionValues: SIZES.map((size, i) => ({
                    name: size,
                    firstSelectableVariant: makeVariant(COLORS[0]!, size, i),
                })),
            },
        ],
        selectedOrFirstAvailableVariant: firstVariant,
        adjacentVariants: [],
        variants: {
            edges: [
                {
                    node: firstVariant,
                },
            ],
        },
    }) as unknown as Product;
