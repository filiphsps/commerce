/**
 * ESM resolver hook that stubs the `server-only` package for Playwright's
 * Node-side test runner.
 *
 * Fixtures like `seed-cms.ts` import from `@nordcom/commerce-cms/api`, which
 * transitively imports `'server-only'`. The `server-only` package's source
 * throws unconditionally — its only job is to make Webpack/Turbopack fail the
 * build if a server-only module ends up in a client bundle. In Playwright,
 * there is no bundler stripping the import, so the throw triggers immediately
 * and crashes every spec before it can run.
 *
 * This hook returns an empty module for `server-only`, mirroring what
 * `vi.mock('server-only', () => ({}))` does for the Vitest suites.
 */
export async function resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') {
        return {
            url: 'data:text/javascript,',
            format: 'module',
            shortCircuit: true,
        };
    }
    return nextResolve(specifier, context);
}
