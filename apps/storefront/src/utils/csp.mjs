/**
 * Content-Security-Policy helpers shared between the Next.js config and tests.
 *
 * This module is authored as `.mjs` rather than `.ts` on purpose: Next.js loads a
 * `next.config.js` through a plain dynamic `import()` and only transpiles
 * `next.config.ts`, so a `.js` config cannot import a TypeScript module at
 * runtime. An ESM `.mjs` is importable by both the config and the TypeScript
 * test, keeping a single source of truth. The adjacent `csp.d.mts` declaration
 * file types the test (it takes precedence over the JS source), so the test
 * type-checks even under `tsconfig.test.json`, where `allowJs` is off.
 */

/**
 * Derive the `connect-src` origins the browser must allow to reach a Convex
 * deployment. Convex's realtime channel upgrades to a WebSocket on the same
 * host, so an `https://` deployment URL yields both an `https:` and a matching
 * `wss:` origin.
 *
 * @param {string | undefined} convexUrl - The Convex deployment URL, typically
 *   `NEXT_PUBLIC_CONVEX_URL`. Unset, blank, or unparseable values yield no
 *   origins so the directive is never polluted with `wss://undefined`.
 * @returns {string[]} The Convex `connect-src` origins (`[]` when unavailable),
 *   ordered as `[httpsOrigin, wssOrigin]`.
 */
export function convexConnectSrcOrigins(convexUrl) {
    if (!convexUrl) {
        return [];
    }

    let url;
    try {
        url = new URL(convexUrl);
    } catch {
        return [];
    }

    // Only HTTP(S) deployment URLs map cleanly onto a WebSocket origin.
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return [];
    }

    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return [`${url.protocol}//${url.host}`, `${wsProtocol}//${url.host}`];
}

/**
 * Build the storefront's `Content-Security-Policy` header value.
 *
 * The storefront connects to many third parties (Shopify, analytics, live
 * chat), so `connect-src` stays permissive over secure schemes to avoid
 * regressing existing behavior — tightening it is future work. The Convex
 * origins are listed explicitly so the reactive islands' gated WebSocket keeps
 * working and the dependency stays documented even if the broad schemes are
 * later removed.
 *
 * @param {{ convexUrl?: string | undefined; isDev?: boolean }} [options] -
 *   `convexUrl` is the Convex deployment URL; `isDev` additionally allows
 *   insecure local schemes so the development server's HMR socket is not
 *   blocked.
 * @returns {string} A `Content-Security-Policy` value containing a `connect-src`
 *   directive.
 */
export function buildContentSecurityPolicy({ convexUrl, isDev = false } = {}) {
    const connectSrc = ["'self'", 'https:', 'wss:'];
    if (isDev) {
        connectSrc.push('http:', 'ws:');
    }
    connectSrc.push(...convexConnectSrcOrigins(convexUrl));

    return `connect-src ${connectSrc.join(' ')};`;
}
