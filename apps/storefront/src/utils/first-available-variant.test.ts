import { describe, expect, it } from 'vitest';

import { firstAvailableVariant } from '@/utils/first-available-variant';

import type { Product } from '@/api/product';

describe('utils', () => {
    describe('firstAvailableVariant', () => {
        it(`should return undefined when given no product`, () => {
            const result = firstAvailableVariant();
            expect(result).toBeUndefined();
        });

        it(`should return the last variant if it is available`, () => {
            const product: Product = {
                variants: {
                    edges: [
                        {
                            node: {
                                id: 'fail',
                                availableForSale: false
                            }
                        },
                        {
                            node: {
                                id: 'pass',
                                availableForSale: true
                            }
                        }
                    ]
                }
            } as any;

            const result = firstAvailableVariant(product);
            expect(result?.id).toEqual('pass');
        });

        it(`should return the next available variant`, () => {
            const product: Product = {
                variants: {
                    edges: [
                        {
                            node: {
                                id: 'fail',
                                availableForSale: false
                            }
                        },
                        {
                            node: {
                                id: 'fail',
                                availableForSale: true
                            }
                        },
                        {
                            node: {
                                id: 'pass',
                                availableForSale: true
                            }
                        },
                        {
                            node: {
                                id: 'fail',
                                availableForSale: false
                            }
                        }
                    ]
                }
            } as any;

            const result = firstAvailableVariant(product);
            expect(result?.id).toEqual('pass');
        });

        it(`should return the last variant if no variants are available`, () => {
            const product: Product = {
                variants: {
                    edges: [
                        {
                            node: {
                                availableForSale: false,
                                id: 'fail'
                            }
                        },
                        {
                            node: {
                                availableForSale: false,
                                id: 'fail'
                            }
                        },
                        {
                            node: {
                                availableForSale: false,
                                id: 'pass'
                            }
                        }
                    ]
                }
            } as any;

            const result = firstAvailableVariant(product);
            expect(result?.id).toEqual('pass');
        });
    });
});
