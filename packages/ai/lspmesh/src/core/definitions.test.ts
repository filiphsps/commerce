import { describe, expect, it } from 'vitest';

import { isDefinitionSnippet } from './definitions.js';

describe('isDefinitionSnippet', () => {
    const cases: [string, boolean][] = [
        ['export const ShopifyApolloApiClient = async ({', true],
        ["import { X } from '@/api/shopify';", false],
        ['isProduction: boolean;', false],
        ['export function isProduction() {', true],
        ['export type Foo = {', true],
        ['export interface Bar {', true],
        ["export { isProduction } from './env';", false],
        ["export * from './x';", false],
        ['enum Kind {', true],
        ['abstract class Base {', true],
    ];
    it.each(cases)('classifies %j as %s', (snip, expected) => {
        expect(isDefinitionSnippet(snip)).toBe(expected);
    });
});
