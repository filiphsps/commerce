import { describe, expect, it } from 'vitest';

import { commonValidations } from './common-validations';

import type { NextURL } from 'next/dist/server/web/next-url';

describe('middleware', () => {
    describe('commonValidations', () => {
        it('should remove "x-default/" from the URL pathname', () => {
            const url: NextURL = { pathname: '/x-default/products' } as any;
            const result = commonValidations(url);
            expect(result.pathname).toBe('/products/');
        });

        it('should remove double slashes from the URL pathname', () => {
            const url: NextURL = { pathname: '/products//details' } as any;
            const result = commonValidations(url);
            expect(result.pathname).toBe('/products/details/');
        });

        it('should add a trailing slash to the URL pathname if it does not have one', () => {
            const url: NextURL = { pathname: '/products' } as any;
            const result = commonValidations(url);
            expect(result.pathname).toBe('/products/');
        });

        it('should not add a trailing slash to the URL pathname if it already has one', () => {
            const url: NextURL = { pathname: '/products/' } as any;
            const result = commonValidations(url);
            expect(result.pathname).toBe('/products/');
        });

        it('should not add a trailing slash to the URL pathname if it ends with a file extension', () => {
            const url: NextURL = { pathname: '/products/image.jpg' } as any;
            const result = commonValidations(url);
            expect(result.pathname).toBe('/products/image.jpg');
        });

        it('should not add a trailing slash to the URL pathname if it ends with a well-known path', () => {
            const url: NextURL = { pathname: '/.well-known/acme-challenge/token' } as any;
            const result = commonValidations(url);
            expect(result.pathname).toBe('/.well-known/acme-challenge/token');
        });

        it('should not add a trailing slash to the URL pathname if it includes a query parameter', () => {
            const url: NextURL = { pathname: '/products/test?hello=world' } as any;
            const result = commonValidations(url);
            expect(result.pathname).toBe('/products/test/?hello=world');
        });
    });
});
