import 'server-only';

import { convexServerQuery } from '@nordcom/commerce-db';

/**
 * The storefront's CMS read transport — the TEARDOWN-02 successor to the
 * SFREAD-12 dual-read shadow loader. The cutover finished and the Payload
 * backend is gone, so every getter is a straight-line call into the Convex
 * `cms/read` functions through the `packages/db` server-trust seam. The
 * loader's only remaining job is injection: tests substitute the transport so
 * the getter suites prove the exact wire calls (function path + args) and the
 * SFREAD-01 identity-passthrough/null-on-missing contract without a
 * deployment.
 *
 * Failure posture: a Convex read error propagates to the caller. The dual-read
 * era's fall-back-to-Mongo net is retired with the snapshot it fell back to;
 * the host pages own their error boundaries.
 */
export type CmsReadQuery = (name: string, args: Record<string, unknown>) => Promise<unknown>;

/** The production transport: the `packages/db` server-trust query seam. */
const defaultQuery: CmsReadQuery = (name, args) => convexServerQuery(name, args);

let query: CmsReadQuery = defaultQuery;

/**
 * Test hook: substitute (or with `null` restore) the Convex query transport
 * the CMS getters drive.
 *
 * @param override - The replacement transport, or `null` to restore the server-trust seam.
 */
export function __setCmsReadQuery(override: CmsReadQuery | null): void {
    query = override ?? defaultQuery;
}

/**
 * Runs one Convex `cms/read` query through the injected transport.
 *
 * @param name - The Convex function path in `module/path:function` form.
 * @param args - The query's args.
 * @returns The query's result, untouched — the getters serve it as the
 *   contract shape (SFREAD-01 identity passthrough).
 */
export function cmsRead(name: string, args: Record<string, unknown>): Promise<unknown> {
    return query(name, args);
}
