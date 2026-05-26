/**
 * ESM resolver hook that stubs the `server-only` package so it can be
 * imported from a Node.js context (Playwright runner, dev CLI, etc.) without
 * tripping the unconditional throw in its source. Mirrors the Vitest pattern
 * `vi.mock('server-only', () => ({}))` for environments that don't have it.
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
