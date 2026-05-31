import { describe, expect, it } from 'vitest';

import { buildContentSecurityPolicy, convexConnectSrcOrigins } from './csp.mjs';

/**
 * Extract the space-separated tokens of the `connect-src` directive from a
 * `Content-Security-Policy` header value.
 *
 * @param policy - A `Content-Security-Policy` header value.
 * @returns The `connect-src` source tokens, or `[]` when the directive is absent.
 */
function connectSrcTokens(policy: string): string[] {
    const directive = policy
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith('connect-src'));

    if (!directive) {
        return [];
    }

    return directive
        .replace(/^connect-src\s*/, '')
        .split(/\s+/)
        .filter(Boolean);
}

describe('convexConnectSrcOrigins', () => {
    it('derives both the https and wss origins from a Convex deployment URL', () => {
        expect(convexConnectSrcOrigins('https://example-1.convex.cloud')).toStrictEqual([
            'https://example-1.convex.cloud',
            'wss://example-1.convex.cloud',
        ]);
    });

    it('preserves a non-default port on both origins', () => {
        expect(convexConnectSrcOrigins('https://example-1.convex.cloud:8443')).toStrictEqual([
            'https://example-1.convex.cloud:8443',
            'wss://example-1.convex.cloud:8443',
        ]);
    });

    it('omits origins when the Convex URL is unset', () => {
        expect(convexConnectSrcOrigins(undefined)).toStrictEqual([]);
        expect(convexConnectSrcOrigins('')).toStrictEqual([]);
    });

    it('omits origins when the Convex URL is unparseable', () => {
        expect(convexConnectSrcOrigins('not a url')).toStrictEqual([]);
    });
});

describe('buildContentSecurityPolicy', () => {
    it('includes both the https and wss Convex origins in connect-src', () => {
        const policy = buildContentSecurityPolicy({ convexUrl: 'https://example-1.convex.cloud' });
        const tokens = connectSrcTokens(policy);

        expect(tokens).toContain('https://example-1.convex.cloud');
        expect(tokens).toContain('wss://example-1.convex.cloud');
    });

    it('does not emit Convex origins when the URL is unset', () => {
        const tokens = connectSrcTokens(buildContentSecurityPolicy({ convexUrl: undefined }));

        expect(tokens.some((token) => token.includes('convex'))).toBe(false);
        expect(tokens.some((token) => token.includes('undefined'))).toBe(false);
    });
});
