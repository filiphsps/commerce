/**
 * Type declarations for the JavaScript `csp.mjs` module.
 *
 * The implementation lives in `.mjs` so `next.config.js` can import it at
 * runtime (Next.js only transpiles `next.config.ts`). These declarations type
 * the import for the test, which runs under `tsconfig.test.json` where
 * `allowJs` is off — so the JS source's own JSDoc types are not consulted.
 */

/**
 * Derive the Convex `connect-src` origins (`https:` and matching `wss:`) from a
 * deployment URL. Returns `[]` when the URL is unset or unparseable.
 *
 * @param convexUrl - The Convex deployment URL, typically `NEXT_PUBLIC_CONVEX_URL`.
 * @returns The Convex `connect-src` origins ordered as `[httpsOrigin, wssOrigin]`.
 */
export function convexConnectSrcOrigins(convexUrl: string | undefined): string[];

/**
 * Build the storefront's `Content-Security-Policy` header value with a
 * `connect-src` directive that allows the Convex origins.
 *
 * @param options - `convexUrl` is the Convex deployment URL; `isDev` additionally
 *   allows insecure local schemes for the development HMR socket.
 * @returns A `Content-Security-Policy` header value.
 */
export function buildContentSecurityPolicy(options?: { convexUrl?: string | undefined; isDev?: boolean }): string;
