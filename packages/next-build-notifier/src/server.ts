import { type BuildIdEnv, resolveBuildId } from './shared/resolve-build-id';

export { type BuildIdEnv, resolveBuildId } from './shared/resolve-build-id';

/**
 * Options for {@link createVersionRoute}.
 */
export type CreateVersionRouteOptions = {
    /** Override how the runtime build id is derived. Defaults to {@link defaultResolveId}. */
    resolveId?: (env: BuildIdEnv) => string;
    /** Extra response headers merged over the defaults. */
    headers?: Record<string, string>;
};

/**
 * Default build-id resolver for the version route. Reads `NEXT_PUBLIC_BUILD_ID` via a DIRECT member
 * access so Next inlines the build-baked id into the server bundle, falling back to
 * {@link resolveBuildId} for apps that don't bake one.
 *
 * @param env - The runtime environment bag, forwarded to the {@link resolveBuildId} fallback.
 * @returns The resolved build id.
 * @remarks This must read `process.env.NEXT_PUBLIC_BUILD_ID` directly — NOT through the `env` object —
 * because Next only inlines literal `process.env.X` accesses (a `const e = process.env; e.X` read is
 * never inlined; see the Next env-variables docs). `resolveBuildId(process.env)` passes the whole
 * object, so at runtime the baked id is invisible there and the chain collapses to whatever ambient
 * runtime var happens to be set (Vercel's `VERCEL_DEPLOYMENT_ID`) or `'development'`. That reports a
 * DIFFERENT id than the client baked into `currentBuildId`, so `updateAvailable` stays true forever
 * and the "update available" banner never clears — no reload fixes it.
 */
function defaultResolveId(env: BuildIdEnv): string {
    return process.env.NEXT_PUBLIC_BUILD_ID || resolveBuildId(env);
}

/**
 * Creates a Next.js App Router route handler that serves the current deployment's build id as
 * `{ id, ts }`. Mount it at a stable path (default convention: `/api/version`) and export its `GET`.
 * The response is `no-store` so a polling client always sees the live deployment's id.
 *
 * @param options - See {@link CreateVersionRouteOptions}.
 * @returns An object with a `GET` handler returning a web `Response`.
 * @remarks
 * `options.headers` is spread last, so it can override ANY default header — including
 * `content-type` and `cache-control`. Overriding `cache-control` removes the `no-store`
 * guarantee the polling client relies on (it may then read a cached, stale build id), so only
 * override it deliberately.
 *
 * The route must render dynamically — note `export const dynamic = 'force-dynamic'` in the
 * example. Without it a statically-rendered route freezes `ts` and `id` at build time and never
 * reports a newer deployment.
 * @example
 * ```ts
 * // app/api/version/route.ts
 * import { createVersionRoute } from 'next-build-notifier/server';
 * export const dynamic = 'force-dynamic';
 * export const { GET } = createVersionRoute();
 * ```
 */
export function createVersionRoute(options: CreateVersionRouteOptions = {}): { GET: () => Promise<Response> } {
    const resolveId = options.resolveId ?? defaultResolveId;

    async function GET(): Promise<Response> {
        const id = resolveId(process.env as BuildIdEnv);
        return new Response(JSON.stringify({ id, ts: Date.now() }), {
            status: 200,
            headers: {
                'content-type': 'application/json; charset=utf-8',
                'cache-control': 'no-store, max-age=0, must-revalidate',
                ...options.headers,
            },
        });
    }

    return { GET };
}
