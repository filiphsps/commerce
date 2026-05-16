export function mockProduct(overrides: Record<string, unknown> = {}) {
    return {
        id: 'gid://shopify/Product/1',
        handle: 'demo-product',
        title: 'Demo Product',
        descriptionHtml: '<p>Demo description.</p>',
        productType: 'Demo',
        vendor: 'Demo Vendor',
        availableForSale: true,
        priceRange: {
            minVariantPrice: { amount: '10.00', currencyCode: 'USD' },
            maxVariantPrice: { amount: '10.00', currencyCode: 'USD' },
        },
        images: {
            nodes: [
                {
                    url: 'https://cdn.shopify.com/s/files/1/0001/0001/0001/files/demo.jpg',
                    altText: 'demo',
                    width: 800,
                    height: 800,
                },
            ],
        },
        variants: {
            nodes: [
                {
                    id: 'gid://shopify/ProductVariant/1',
                    sku: 'SKU-1',
                    availableForSale: true,
                    selectedOptions: [{ name: 'Size', value: 'M' }],
                    price: { amount: '10.00', currencyCode: 'USD' },
                },
            ],
        },
        ...overrides,
    };
}
