import type {
    Metafield,
    PageInfo,
    ProductSortKeys,
    SearchResultItemConnection,
    Product as ShopifyProduct,
    ProductVariant as ShopifyVariant,
} from '@shopify/hydrogen-react/storefront-api-types';
import type { OmitTypeName } from '@/utils/abstract-api';

export type ProductVariant = {
    metafields: ShopifyVariant['metafields'] | undefined;

    quantityBreaks?:
        | {
              id: string;
              namespace: string;
              reference: {
                  handle: string;
                  steps: {
                      references: {
                          edges: {
                              node: {
                                  minimumQuantity: {
                                      value: string;
                                  };
                                  value: {
                                      value: string;
                                  };
                              };
                          }[];
                      };
                  };
              };
          }
        | undefined
        | null;
} & OmitTypeName<Omit<ShopifyVariant, 'metafields'>>;

export type Product = {
    productType?: string | null;
    descriptionHtml: string;

    variants: {
        edges: Array<{
            node: ProductVariant;
        }>;
        pageInfo: PageInfo;
    };

    originalName?: Metafield | undefined | null;
    nutritionalContent?: Metafield | undefined | null;
    ingredients?: Metafield | undefined | null;
    flavors?: Metafield | undefined | null;

    // Built-in metafields.
    allergen?: Metafield | undefined | null;
    rating?: Metafield | undefined | null;
    ratingCount?: Metafield | undefined | null;
} & OmitTypeName<Omit<ShopifyProduct, 'productType' | 'descriptionHtml' | 'variants' | 'ingredients' | 'originalName'>>;

export type ProductFilters = SearchResultItemConnection['productFilters'];

/**
 * Serializes a product's Shopify tracking parameters into a URL query string.
 *
 * @param options - Options object.
 * @param options.product - Product with optional `trackingParameters` field.
 * @returns A URL-encoded query string, or an empty string when no tracking parameters are present.
 */
export const createProductSearchParams = ({
    product: { trackingParameters },
}: {
    product: Partial<Product>;
}): string => {
    if (!trackingParameters) {
        return '';
    }

    return new URLSearchParams(trackingParameters).toString();
};

/**
 * Returns whether a product is tagged vegan and belongs to a category where the claim is meaningful.
 *
 * @param product - Product to evaluate.
 * @returns `true` only for food/clothing/accessories/sports products carrying the `"vegan"` tag.
 */
export const isProductVegan = (product: Product): boolean => {
    if (product.tags.length <= 0) {
        return false;
    }

    const type = productType(product);
    if (type ? !['confectionary', 'food', 'bags', 'clothing', 'sports'].includes(type) : false) {
        return false;
    }

    return product.tags.map((tag) => tag.toLowerCase().trim()).includes('vegan');
};

/**
 * Returns whether a product's type maps to the confectionary category.
 *
 * @param product - Product to evaluate.
 * @returns `true` when `productType` matches a known confectionary keyword such as `"cake"`, `"candy"`, etc.
 */
export const isProductConfectionary = (product: Product): boolean => {
    if (!product.productType) {
        return false;
    }

    const type = product.productType.toLowerCase().trim();
    const applicableTypes = [
        'bakery',
        'cake',
        'candy',
        'chocolate',
        'confectionary',
        'cookies',
        'dessert',
        'pastry',
        'pie',
        'snack',
        'snacks',
        'sweets',
    ];

    if (applicableTypes.some((t) => type.includes(t))) {
        return true;
    }

    return false;
};

export type ProductType =
    | 'confectionary'
    | 'food'
    | 'accessories'
    | 'bags'
    | 'jewelry'
    | 'watches'
    | 'clothing'
    | 'sports'
    | 'other';
/**
 * Resolves a product to one of the canonical platform category tokens.
 *
 * @param product - Product to classify.
 * @returns The matching `ProductType`, or `null` when no category can be determined.
 */
export const productType = (product: Product): ProductType | null => {
    if (isProductConfectionary(product)) {
        return 'confectionary';
    }

    return null;
};

export type ProductSorting = ProductSortKeys;

/**
 * Parses the quantity-break metafield into a flat list of price-break tier objects.
 *
 * @param quantityBreaks - Raw `quantityBreaks` metafield value from a product variant.
 * @returns Array of `{ minimumQuantity, value }` tiers, or `null` when absent or unparseable.
 */
export function transformQuantityBreaks(quantityBreaks: ProductVariant['quantityBreaks']) {
    if (!quantityBreaks) {
        return null;
    }

    try {
        const { reference } = quantityBreaks;
        const { steps } = reference;
        return steps.references.edges.map(({ node: { minimumQuantity, value } }) => ({
            minimumQuantity: Number.parseInt(minimumQuantity.value, 10),
            value: Number.parseFloat(value.value),
        }));
    } catch {
        // TODO: Handle errors properly.
        return null;
    }
}
