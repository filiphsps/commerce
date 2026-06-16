import { type BuildIdEnv, resolveBuildId } from './shared/resolve-build-id';

export { type BuildIdEnv, resolveBuildId } from './shared/resolve-build-id';

/**
 * Options for {@link createVersionRoute}.
 */
export type CreateVersionRouteOptions = {
    /** Override how the runtime build id is derived. Defaults to {@link resolveBuildId}. */
    resolveId?: (env: BuildIdEnv) => string;
    /** Extra response headers merged over the defaults. */
    headers?: Record<string, string>;
};

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
    const resolveId = options.resolveId ?? resolveBuildId;

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
