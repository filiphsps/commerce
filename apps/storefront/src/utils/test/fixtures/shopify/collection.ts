import { mockProduct } from './product';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export function mockCollection(overrides: DeepPartial<any> = {}) {
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
