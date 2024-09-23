import { NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';

import { TitleToHandle } from '@/utils/title-to-handle';
import { gql } from '@apollo/client';

import type { VendorModel } from '@/models/VendorModel';
import type { AbstractApi } from '@/utils/abstract-api';
import type { Product, ProductConnection } from '@shopify/hydrogen-react/storefront-api-types';

/**
 * Convert the Shopify product list to a list of vendors.
 * TODO: Remove this and use the standard layout.
 *
 * @param {Array<{ node: Product }>} products - The list of products.
 * @returns {VendorModel[]} The list of vendors.
 */
export const Convertor = (
    products: Array<{
        node: Product;
    }>
): VendorModel[] => {
    let vendors: any[] = [];
    products.forEach((product) => {
        if (!product.node.vendor) return;

        vendors.push(product.node.vendor);
    });
    vendors = vendors.filter((item, pos, self) => {
        return self.indexOf(item) == pos;
    });

    // Remove duplicates and create a proper object
    return (
        Array.from(new Set(vendors)).map((vendor) => ({
            title: vendor,
            handle: TitleToHandle(vendor)
        })) as any
    ).filter((_: VendorModel) => _);
};

type VendorsOptions = { api: AbstractApi };

/**
 * Get all vendors from Shopify.
 *
 * @param {AbstractApi} api - The client to use for the query.
 * @returns {Promise<VendorModel[]>} The list of vendors.
 */
export const VendorsApi = async ({ api }: VendorsOptions): Promise<VendorModel[]> => {
    const shop = api.shop();

    try {
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
    } catch (error: unknown) {
        throw error;
    }
};
