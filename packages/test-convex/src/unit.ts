import type { convexTest } from 'convex-test';

/**
 * In-memory Convex test harness produced by {@link createUnitConvex}. Mirrors
 * the object returned by `convex-test`'s `convexTest`, exposing `query`,
 * `mutation`, `action`, and `run` against a transient backend with no network.
 */
export type UnitConvexHarness = ReturnType<typeof convexTest>;

/**
 * Builds the `convex-test` harness wired to the commerce Convex schema and
 * function modules, for fast unit tests that never start a real backend.
 *
 * @returns A {@link UnitConvexHarness} bound to the commerce schema.
 * @throws Always until HARNESS-02 wires the schema and module map.
 */
export function createUnitConvex(): UnitConvexHarness {
    throw new Error('@nordcom/commerce-test-convex: createUnitConvex() is not implemented yet (HARNESS-02).');
}
