import { getRequestType } from '@/middleware/router';
import type { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

describe('middleware', () => {
    const createFakeRequest = (hostname: string): NextRequest => {
        return {
            headers: {
                host: hostname,
                get: function (_: string): string {
                    return this.host;
                }
            },
            nextUrl: new URL(`https://${hostname}/`)
        } as any as NextRequest;
    };

    describe('getRequestType', () => {
        it('should return "storefront" for a valid storefront hostname', () => {
            const req = createFakeRequest('www.sweetsideofsweden.com');

            const result = getRequestType(req);
            expect(result).toBe('storefront');
        });

        it('should return "admin" for the Nordcom admin hostname', () => {
            const req = createFakeRequest('shops.nordcom.io');

            const result = getRequestType(req);
            expect(result).toBe('admin');
        });

        it('should return "unknown" for an unknown hostname', () => {
            const req = createFakeRequest('example.com');

            const result = getRequestType(req);
            expect(result).toBe('unknown');
        });
    });
});
