import * as Sentry from '@sentry/nextjs';

import { ProductModel } from '../models/ProductModel';
import TitleToHandle from '../util/TitleToHandle';
import { VendorModel } from '../models/VendorModel';
import { gql } from '@apollo/client';
import { shopify } from './shopify';

export const Convertor = (
    products: Array<{
        node: ProductModel;
    }>
): Array<VendorModel> => {
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
        handle: TitleToHandle(vendor)
    }));
};

export const VendorsApi = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await shopify.query({
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

            resolve(Convertor(res?.data?.products?.edges));
        } catch (error) {
            Sentry.captureException(error);
            console.error(error);
            reject(error);
        }
    });
};
