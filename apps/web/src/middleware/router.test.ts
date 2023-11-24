import { getRequestType } from '@/middleware/router';
import type { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

describe('middleware', () => {
    describe('router', () => {
        const createFakeRequest = (hostname: string): NextRequest => {
            return {
                headers: {
                    host: hostname,
                    get: function (_: string): string {
                        return this.host;
                    }
                },
                nextUrl: new URL(`https://${hostname}/en-US/`)
            } as any as NextRequest;
        };

        describe('getRequestType', () => {
            it('should return "storefront" for a valid storefront hostname', async () => {
                vi.mock('@/middleware/storefront', () => ({
                    storefront: vi.fn().mockRejectedValue(undefined)
                }));

                const req = createFakeRequest('staging.demo.nordcom.io');

                const result = await getRequestType(req);
                expect(result).toBe('storefront');
            });

            it('should return "admin" for the Nordcom admin hostname', async () => {
                const req = createFakeRequest('shops.nordcom.io');

                const result = await getRequestType(req);
                expect(result).toBe('admin');
            });

            it.fails('should return "unknown" for an unknown hostname', async () => {
                vi.spyOn(console, 'warn').mockImplementation(() => {});

                const req = createFakeRequest('example.com');

                const result = await getRequestType(req);
                expect(result).toBe('unknown');
            });
        });
    });
});
