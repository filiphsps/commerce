import { storefrontClient } from '@/api/shopify';
import type { VendorModel } from '@/models/VendorModel';
import type { Locale } from '@/utils/locale';
import { TitleToHandle } from '@/utils/title-to-handle';
import type { Product } from '@shopify/hydrogen-react/storefront-api-types';
import { gql } from 'graphql-tag';

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
        handle: TitleToHandle(vendor)
    }));
};

export const VendorsApi = async ({ locale }: { locale: Locale }): Promise<VendorModel[]> => {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await storefrontClient.query({
                query: gql`
                    query products($language: LanguageCode!, $country: CountryCode!)
                    @inContext(language: $language, country: $country) {
                        products(first: 250, sortKey: BEST_SELLING) {
                            edges {
                                node {
                                    id
                                    vendor
                                }
                            }
                        }
                    }
                `,
                variables: {
                    language: locale.language,
                    country: locale.country
                }
            });

            return resolve(Convertor(res?.data?.products?.edges));
        } catch (error) {
            console.error(error);
            return reject(error);
        }
    });
};
