import { gql } from '@apollo/client';
import { NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import type { Product, ProductConnection } from '@shopify/hydrogen-react/storefront-api-types';

import type { VendorModel } from '@/models/VendorModel';
import type { AbstractApi } from '@/utils/abstract-api';
import { TitleToHandle } from '@/utils/title-to-handle';

/**
 * Convert the Shopify product list to a list of vendors.
 * TODO: Remove this and use the standard layout.
 *
 * @param products - The list of products.
 * @returns The list of vendors.
 */
export const Convertor = (
    products: Array<{
        node: Product;
    }>,
): VendorModel[] => {
    let vendors: string[] = [];
    products.forEach((product) => {
        if (!product.node.vendor) return;

        vendors.push(product.node.vendor);
    });
    vendors = vendors.filter((item, pos, self) => {
        return self.indexOf(item) === pos;
    });

    // Remove duplicates and create a proper object
    return Array.from(new Set(vendors))
        .map((vendor) => ({
            title: vendor,
            handle: TitleToHandle(vendor),
        }))
        .filter((_): _ is VendorModel => Boolean(_));
};

type VendorsOptions = { api: AbstractApi };

/**
 * Get all vendors from Shopify.
 *
 * @param api - The client to use for the query.
 * @returns The list of vendors.
 */
export const VendorsApi = async ({ api }: VendorsOptions): Promise<VendorModel[]> => {
    const shop = api.shop();
    const { data, errors } = await api.query<{ products: ProductConnection }>(gql`
            query products {
                products(first: 250, sortKey: BEST_SELLING) {
                    edges {
                        node {
                            id
                            vendor
                        }
                    }
                }
            }
        `);

    if (errors && errors.length > 0) {
        throw new ProviderFetchError(errors);
    }
    if (!data?.products || data.products.edges.length <= 0) {
        throw new NotFoundError(`"vendors" on shop "${shop.id}"`);
    }

    return Convertor(data.products.edges!);
};
