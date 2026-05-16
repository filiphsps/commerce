import { mockProduct } from './product';

export function mockCollection(overrides: Record<string, unknown> = {}) {
    return {
        id: 'gid://shopify/Collection/1',
        handle: 'demo-collection',
        title: 'Demo Collection',
        descriptionHtml: '<p>Collection description.</p>',
        products: {
            nodes: [mockProduct()],
            pageInfo: { hasNextPage: false, endCursor: null },
        },
        ...overrides,
    };
}
