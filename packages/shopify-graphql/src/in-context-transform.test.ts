import { gql } from '@apollo/client';
import { print } from 'graphql';
import { describe, expect, it } from 'vitest';
import { inContextTransform } from './in-context-transform';

describe('inContextTransform', () => {
    // Cannot use toThrow(DuplicateContextDirectiveError) directly because the Error<T> base
    // class in @nordcom/commerce-errors calls Object.setPrototypeOf(this, Error.prototype),
    // which breaks instanceof for all subclasses. Asserting on `name` (and `description`) is
    // the workaround pattern.

    it('adds $country, $language, and @inContext to a plain query', () => {
        const input = gql`
            query Products {
                products(first: 10) {
                    edges {
                        node {
                            id
                        }
                    }
                }
            }
        `;
        const out = print(inContextTransform.transformDocument(input));
        expect(out).toContain('$country: CountryCode');
        expect(out).toContain('$language: LanguageCode');
        expect(out).toContain('@inContext(country: $country, language: $language)');
    });

    it('adds vars + directive to a mutation', () => {
        const input = gql`
            mutation CartCreate {
                cartCreate {
                    cart {
                        id
                    }
                }
            }
        `;
        const out = print(inContextTransform.transformDocument(input));
        expect(out).toContain('$country: CountryCode');
        expect(out).toContain('$language: LanguageCode');
        expect(out).toContain('@inContext(country: $country, language: $language)');
    });

    it('throws DuplicateContextDirectiveError if @inContext already present (named operation)', () => {
        const input = gql`
            query Products($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
                products(first: 10) {
                    edges {
                        node {
                            id
                        }
                    }
                }
            }
        `;
        expect(() => inContextTransform.transformDocument(input)).toThrow(
            expect.objectContaining({
                name: 'DuplicateContextDirectiveError',
                description: expect.stringContaining('Products'),
            }),
        );
    });

    it('includes operation kind in error when operation is anonymous', () => {
        const input = gql`
            query @inContext(country: $country, language: $language) {
                products(first: 1) {
                    edges {
                        node {
                            id
                        }
                    }
                }
            }
        `;
        expect(() => inContextTransform.transformDocument(input)).toThrow(
            expect.objectContaining({
                name: 'DuplicateContextDirectiveError',
                description: expect.stringContaining('<anonymous query>'),
            }),
        );
    });

    it('throws DuplicateContextVariableError if $country already declared', () => {
        const input = gql`
            query Products($country: CountryCode) {
                products(first: 10) {
                    edges {
                        node {
                            id
                        }
                    }
                }
            }
        `;
        expect(() => inContextTransform.transformDocument(input)).toThrow(
            expect.objectContaining({
                name: 'DuplicateContextVariableError',
                description: expect.stringContaining('Products'),
            }),
        );
    });

    it('throws DuplicateContextVariableError if $language already declared', () => {
        const input = gql`
            query Products($language: LanguageCode) {
                products(first: 10) {
                    edges {
                        node {
                            id
                        }
                    }
                }
            }
        `;
        expect(() => inContextTransform.transformDocument(input)).toThrow(
            expect.objectContaining({
                name: 'DuplicateContextVariableError',
                description: expect.stringContaining('Products'),
            }),
        );
    });

    it('transforms a standalone mutation with @inContext independently', () => {
        const queryInput = gql`
            query A {
                products(first: 1) {
                    edges {
                        node {
                            id
                        }
                    }
                }
            }
        `;
        const mutationInput = gql`
            mutation B {
                cartCreate {
                    cart {
                        id
                    }
                }
            }
        `;
        const queryOut = print(inContextTransform.transformDocument(queryInput));
        const mutationOut = print(inContextTransform.transformDocument(mutationInput));
        const queryMatches = queryOut.match(/@inContext/g) ?? [];
        const mutationMatches = mutationOut.match(/@inContext/g) ?? [];
        expect(queryMatches.length).toBe(1);
        expect(mutationMatches.length).toBe(1);
    });
});
