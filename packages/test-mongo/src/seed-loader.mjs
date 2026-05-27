/**
 * ESM resolver hook used by seed-time scripts (root predev-mongo, Playwright
 * globalSetup) that need to call `seedCanonical` / Payload's local API from
 * outside a Next.js render context.
 *
 * Stubs:
 *   - `server-only`        → empty module (otherwise its top-level throw fires).
 *   - `next/cache`         → no-op `revalidateTag` / `revalidatePath` and a
 *                            passthrough `unstable_cache`. Payload's
 *                            `afterChange` hooks call `revalidateTag` via
 *                            `@tagtree/next`; the call throws with
 *                            "static generation store missing" when invoked
 *                            outside a Next request.
 *
 * Keep this loader narrow — it must only short-circuit specifiers that are
 * load-bearing for in-process seeding. Anything broader risks masking real
 * Next runtime behavior when the Playwright webServer inherits NODE_OPTIONS.
 */

const STUBS = {
    'server-only': '',
    'next/cache': [
        'export function revalidateTag() {}',
        'export function revalidatePath() {}',
        'export function unstable_cache(fn) { return fn; }',
        'export const unstable_noStore = () => {};',
    ].join('\n'),
};

export async function resolve(specifier, context, nextResolve) {
    if (Object.hasOwn(STUBS, specifier)) {
        return {
            url: `data:text/javascript,${encodeURIComponent(STUBS[specifier])}`,
            format: 'module',
            shortCircuit: true,
        };
    }
    return nextResolve(specifier, context);
}
