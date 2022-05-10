import { post } from '../api/fetcher';

const AddToCart = (item?: any) => {
    return new Promise(async (resolve, reject) => {
        /* (window as any).ShopifyAnalytics?.lib?.track?.(
            'monorail://trekkie_storefront_track_added_product/1.1',
            {
                brand: 'Lyft',
                category: 'Can',
                currency: 'CHF',
                isMerchantRequest: null,
                isPersistentCookie: true,
                microSessionCount: 6,
                microSessionId: 'af847f02-C9AA-4019-D965-A49D0D560FF1',
                name: 'Freeze Slim',
                pageType: 'product',
                price: 2.9,
                productId: 4172080480319,
                properties: {},
                quantity: '1',
                referer: 'https://business.nordicpouch.com/products/freeze',
                resourceId: 4172080480319,
                resourceType: 'product',
                shopId: 11237654591,
                sku: '',
                themeCityHash: '4956334922573760207',
                themeId: 82768265279,
                uniqToken: '507f0898-22c4-4dec-8d29-96480095d4ea',
                variant: null,
                variantId: '33347785490495',
                visitToken: 'adaeaf4e-0ced-4a75-beab-84b9f89c2837'
            }
        ); */

        reject('unused');
    });
};

export default AddToCart;
