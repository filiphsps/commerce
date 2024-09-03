import { describe, expect, it, vi } from 'vitest';

import type { OnlineShop } from '@nordcom/commerce-db';

import { CollectionApi, CollectionsApi, CollectionsPaginationApi } from '@/api/shopify/collection';
import { Locale } from '@/utils/locale';

import type { AbstractApi } from '@/utils/abstract-api';

describe('api', () => {
    describe('shopify', () => {
        describe('collection', () => {
            describe('CollectionApi', () => {
                it('should return a collection when a valid handle is provided', async () => {
                    const api: AbstractApi = {
                        query: vi.fn().mockResolvedValue({
                            data: {
                                collection: {
                                    id: '123',
                                    handle: 'test-collection',
                                    title: 'Test Collection',
                                    description: 'This is a test collection',
                                    descriptionHtml: '<p>This is a test collection</p>',
                                    image: {
                                        id: '456',
                                        altText: 'Test Collection Image',
                                        url: 'https://example.com/test-collection.jpg',
                                        height: 500,
                                        width: 500
                                    },
                                    seo: {
                                        title: 'Test Collection SEO Title',
                                        description: 'Test Collection SEO Description'
                                    },
                                    products: {
                                        edges: [
                                            {
                                                node: {
                                                    id: '789'
                                                }
                                            }
                                        ],
                                        pageInfo: {
                                            startCursor: 'start',
                                            endCursor: 'end',
                                            hasNextPage: false,
                                            hasPreviousPage: false
                                        }
                                    },
                                    keywords: {
                                        value: 'test, collection'
                                    },
                                    isBrand: {
                                        value: 'true'
                                    },
                                    shortDescription: {
                                        value: 'Short description of the test collection'
                                    }
                                }
                            }
                        }),
                        locale: () => Locale.default,
                        shop: () => ({}) as OnlineShop
                    };

                    const collection = await CollectionApi({ api, handle: 'test-collection', filters: {} });

                    expect(collection).toEqual({
                        id: '123',
                        handle: 'test-collection',
                        title: 'Test Collection',
                        description: 'This is a test collection',
                        descriptionHtml: '<p>This is a test collection</p>',
                        image: {
                            id: '456',
                            altText: 'Test Collection Image',
                            url: 'https://example.com/test-collection.jpg',
                            height: 500,
                            width: 500
                        },
                        seo: {
                            title: 'Test Collection SEO Title',
                            description: 'Test Collection SEO Description'
                        },
                        products: {
                            edges: [
                                {
                                    node: {
                                        id: '789'
                                    }
                                }
                            ],
                            pageInfo: {
                                startCursor: 'start',
                                endCursor: 'end',
                                hasNextPage: false,
                                hasPreviousPage: false
                            }
                        },
                        keywords: {
                            value: 'test, collection'
                        },
                        isBrand: {
                            value: 'true'
                        },
                        shortDescription: {
                            value: 'Short description of the test collection'
                        }
                    });
                });

                it('should parse filters properly', async () => {
                    const api: AbstractApi = {
                        query: vi.fn().mockResolvedValue({
                            data: {
                                collection: {
                                    id: '123',
                                    handle: 'test-collection',
                                    title: 'Test Collection',
                                    description: 'This is a test collection',
                                    descriptionHtml: '<p>This is a test collection</p>',
                                    image: {
                                        id: '456',
                                        altText: 'Test Collection Image',
                                        url: 'https://example.com/test-collection.jpg',
                                        height: 500,
                                        width: 500
                                    },
                                    seo: {
                                        title: 'Test Collection SEO Title',
                                        description: 'Test Collection SEO Description'
                                    },
                                    products: {
                                        edges: [
                                            {
                                                node: {
                                                    id: '789'
                                                }
                                            }
                                        ],
                                        pageInfo: {
                                            startCursor: 'start',
                                            endCursor: 'end',
                                            hasNextPage: false,
                                            hasPreviousPage: false
                                        }
                                    },
                                    keywords: {
                                        value: 'test, collection'
                                    },
                                    isBrand: {
                                        value: 'true'
                                    },
                                    shortDescription: {
                                        value: 'Short description of the test collection'
                                    }
                                }
                            }
                        }),
                        locale: () => Locale.default,
                        shop: () => ({}) as OnlineShop
                    };

                    const handle = 'test-collection';
                    const filters = {
                        sorting: 'BEST_SELLING',
                        after: 'start',
                        before: 'end',
                        limit: 10
                    } as any;

                    const collection = await CollectionApi({ api, handle, filters });

                    expect(collection).toEqual({
                        id: '123',
                        handle: 'test-collection',
                        title: 'Test Collection',
                        description: 'This is a test collection',
                        descriptionHtml: '<p>This is a test collection</p>',
                        image: {
                            id: '456',
                            altText: 'Test Collection Image',
                            url: 'https://example.com/test-collection.jpg',
                            height: 500,
                            width: 500
                        },
                        seo: {
                            title: 'Test Collection SEO Title',
                            description: 'Test Collection SEO Description'
                        },
                        products: {
                            edges: [
                                {
                                    node: {
                                        id: '789'
                                    }
                                }
                            ],
                            pageInfo: {
                                startCursor: 'start',
                                endCursor: 'end',
                                hasNextPage: false,
                                hasPreviousPage: false
                            }
                        },
                        keywords: {
                            value: 'test, collection'
                        },
                        isBrand: {
                            value: 'true'
                        },
                        shortDescription: {
                            value: 'Short description of the test collection'
                        }
                    });
                });

                it.todo('should paginate products when `before` is provided');
                it.todo('should paginate products when `after` is provided');
                it.todo('should fail to paginate products when both `before` and `after` are provided');
            });

            describe('CollectionsApi', () => {
                it('should return an array of collections with their IDs, handles, and product availability', async () => {
                    const client: AbstractApi = {
                        query: vi.fn().mockResolvedValue({
                            data: {
                                collections: {
                                    edges: [
                                        {
                                            node: {
                                                id: '123',
                                                handle: 'collection-1',
                                                products: {
                                                    edges: [
                                                        {
                                                            node: {
                                                                id: '456'
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        },
                                        {
                                            node: {
                                                id: '789',
                                                handle: 'collection-2',
                                                products: {
                                                    edges: []
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }),
                        locale: () => Locale.default,
                        shop: () => ({}) as OnlineShop
                    };

                    const collections = await CollectionsApi({ client });

                    expect(collections).toEqual([
                        {
                            id: '123',
                            handle: 'collection-1',
                            hasProducts: true
                        },
                        {
                            id: '789',
                            handle: 'collection-2',
                            hasProducts: false
                        }
                    ]);
                });
            });

            describe('CollectionsPaginationApi', () => {
                it('should return a paginated list of collections', async () => {
                    const api: AbstractApi = {
                        query: vi.fn().mockResolvedValue({
                            data: {
                                collections: {
                                    edges: [
                                        {
                                            cursor: 'cursor-1',
                                            node: {
                                                id: '123',
                                                handle: 'collection-1',
                                                createdAt: '2022-01-01',
                                                updatedAt: '2022-01-02',
                                                title: 'Collection 1',
                                                description: 'This is collection 1',
                                                descriptionHtml: '<p>This is collection 1</p>',
                                                image: {
                                                    id: '456',
                                                    altText: 'Collection 1 Image',
                                                    url: 'https://example.com/collection-1.jpg',
                                                    height: 500,
                                                    width: 500
                                                },
                                                seo: {
                                                    title: 'Collection 1 SEO Title',
                                                    description: 'Collection 1 SEO Description'
                                                }
                                            }
                                        },
                                        {
                                            cursor: 'cursor-2',
                                            node: {
                                                id: '789',
                                                handle: 'collection-2',
                                                createdAt: '2022-01-03',
                                                updatedAt: '2022-01-04',
                                                title: 'Collection 2',
                                                description: 'This is collection 2',
                                                descriptionHtml: '<p>This is collection 2</p>',
                                                image: {
                                                    id: '012',
                                                    altText: 'Collection 2 Image',
                                                    url: 'https://example.com/collection-2.jpg',
                                                    height: 500,
                                                    width: 500
                                                },
                                                seo: {
                                                    title: 'Collection 2 SEO Title',
                                                    description: 'Collection 2 SEO Description'
                                                }
                                            }
                                        }
                                    ],
                                    pageInfo: {
                                        startCursor: 'cursor-1',
                                        endCursor: 'cursor-2',
                                        hasPreviousPage: false,
                                        hasNextPage: false
                                    }
                                }
                            }
                        }),
                        locale: () => Locale.default,
                        shop: () => ({}) as OnlineShop
                    };

                    const collections = await CollectionsPaginationApi({ api, filters: {} });

                    expect(collections).toEqual({
                        page_info: {
                            start_cursor: 'cursor-1',
                            end_cursor: 'cursor-2',
                            has_next_page: false,
                            has_prev_page: false
                        },
                        collections: [
                            {
                                cursor: 'cursor-1',
                                node: {
                                    id: '123',
                                    handle: 'collection-1',
                                    createdAt: '2022-01-01',
                                    updatedAt: '2022-01-02',
                                    title: 'Collection 1',
                                    description: 'This is collection 1',
                                    descriptionHtml: '<p>This is collection 1</p>',
                                    image: {
                                        id: '456',
                                        altText: 'Collection 1 Image',
                                        url: 'https://example.com/collection-1.jpg',
                                        height: 500,
                                        width: 500
                                    },
                                    seo: {
                                        title: 'Collection 1 SEO Title',
                                        description: 'Collection 1 SEO Description'
                                    }
                                }
                            },
                            {
                                cursor: 'cursor-2',
                                node: {
                                    id: '789',
                                    handle: 'collection-2',
                                    createdAt: '2022-01-03',
                                    updatedAt: '2022-01-04',
                                    title: 'Collection 2',
                                    description: 'This is collection 2',
                                    descriptionHtml: '<p>This is collection 2</p>',
                                    image: {
                                        id: '012',
                                        altText: 'Collection 2 Image',
                                        url: 'https://example.com/collection-2.jpg',
                                        height: 500,
                                        width: 500
                                    },
                                    seo: {
                                        title: 'Collection 2 SEO Title',
                                        description: 'Collection 2 SEO Description'
                                    }
                                }
                            }
                        ]
                    });
                });
            });
        });
    });
});
