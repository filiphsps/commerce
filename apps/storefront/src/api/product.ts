import type { OmitTypeName } from '@/utils/abstract-api';
import type {
    Metafield,
    PageInfo,
    Product as ShopifyProduct,
    ProductSortKeys,
    ProductVariant as ShopifyVariant,
    SearchResultItemConnection
} from '@shopify/hydrogen-react/storefront-api-types';

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
} & OmitTypeName<Omit<ShopifyVariant, 'compareAtPriceV2' | 'priceV2' | 'metafields'>>;

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

export const createProductSearchParams = ({
    product: { trackingParameters }
}: {
    product: Partial<Product>;
}): string => {
    if (!trackingParameters) {
        return '';
    }

    return new URLSearchParams(trackingParameters).toString();
};

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
        'sweets'
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
export const productType = (product: Product): ProductType | null => {
    if (isProductConfectionary(product)) {
        return 'confectionary';
    }

    return null;
};

export type ProductSorting = ProductSortKeys;

export function transformQuantityBreaks(quantityBreaks: ProductVariant['quantityBreaks']) {
    if (!quantityBreaks) {
        return null;
    }

    try {
        const { reference } = quantityBreaks;
        const { steps } = reference;
        return steps.references.edges.map(({ node: { minimumQuantity, value } }) => ({
            minimumQuantity: Number.parseInt(minimumQuantity.value),
            value: Number.parseFloat(value.value)
        }));
    } catch {
        // TODO: Handle errors properly.
        return null;
    }
}
