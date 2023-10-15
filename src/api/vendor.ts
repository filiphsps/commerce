import type { Product } from '@shopify/hydrogen-react/storefront-api-types';
import type { VendorModel } from '../models/VendorModel';
import { gql } from '@apollo/client';
import { storefrontClient } from './shopify';
import { titleToHandle } from '../util/TitleToHandle';

export const Convertor = (
    products: Array<{
        node: Product;
    }>
): VendorModel[] => {
    let vendors: any[] = [];
    products.forEach((product) => {
        if (!product?.node?.vendor) return;

        vendors.push(product.node.vendor);
    });
    vendors = vendors.filter((item, pos, self) => {
        return self.indexOf(item) == pos;
    });

    // Remove duplicates and create a proper object
    return Array.from(new Set(vendors)).map((vendor) => ({
        title: vendor,
        handle: titleToHandle(vendor)
    }));
};

// eslint-disable-next-line no-unused-vars
export const VendorsApi = async ({ locale }: { locale?: string }): Promise<VendorModel[]> => {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await storefrontClient.query({
                query: gql`
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
                `
            });

            return resolve(Convertor(res?.data?.products?.edges));
        } catch (error) {
            console.error(error);
            return reject(error);
        }
    });
};
