import type { GenericSchema, SchemaDefinition } from 'convex/server';
import { convexTest, type TestConvex } from 'convex-test';

/**
 * Module loader map handed to `convex-test`. Each key is a virtual path under the deployment's
 * `/convex/` root; each value lazily resolves that module's exports. `convex-test` resolves
 * `FunctionReference`s and detects the deployment root entirely from this map, so a test that only
 * exercises raw `db` access (`t.run`) still needs the `_generated` key for root detection.
 */
export type UnitModuleMap = Record<string, () => Promise<Record<string, unknown>>>;

/**
 * The dummy `_generated` entry every hand-built `convex-test` map in this repo carries: this package
 * defines no Convex functions of its own, so the map needs only the `_generated/server.js` key for
 * `convex-test`'s root detection. Tests that invoke real functions merge their own fixture modules on
 * top via {@link unitModuleMap}.
 */
const BASE_MODULES: UnitModuleMap = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
};

/**
 * Builds the `convex-test` module map, layering caller-supplied fixture modules over the mandatory
 * `_generated` root-detection entry. Centralizes the map the convex-test call sites previously
 * hand-built so a sample (or any future unit) declares only its own fixture modules.
 *
 * @param extra - Fixture module loaders keyed by their `/convex/<module>.ts` virtual path, merged over
 *   the base map; a colliding key overrides the base entry.
 * @returns The merged {@link UnitModuleMap} ready to pass to `convex-test`.
 */
export function unitModuleMap(extra?: UnitModuleMap): UnitModuleMap {
    return { ...BASE_MODULES, ...extra };
}

/**
 * In-memory Convex test harness produced by {@link createUnitConvex} for the given schema. Mirrors the
 * object returned by `convex-test`'s `convexTest`, exposing `query`, `mutation`, `action`, `run`, and
 * `withIdentity` against a transient backend with no network or subprocess.
 */
export type UnitConvexHarness<Schema extends GenericSchema = GenericSchema> = TestConvex<
    SchemaDefinition<Schema, boolean>
>;

/**
 * Builds the `convex-test` harness for the fast, hermetic unit tier: a fully in-memory backend that
 * never spawns a real deployment or touches the network. The `convex-test` counterpart to the per-file
 * mongoose mocks the Mongo tier relied on.
 *
 * The deployed schema is INJECTED rather than imported here: this package's source is built under a
 * composite `tsconfig` with `rootDir: src`, so a runtime (value) import of the sibling convex package's
 * `schema.ts` would fail `tsc` with TS6059 ("not under rootDir"). The schema's value import therefore
 * lives in the calling `*.test.ts` (excluded from the composite build), exactly as the convex-test
 * fixtures hand it to `convexTest` today, and the binding flows through this thin wrapper.
 *
 * @param schema - The deployed Convex schema (the default export of the convex package's `schema.ts`).
 * @param extra - Optional fixture module loaders (keyed by `/convex/<module>.ts` virtual path) merged
 *   over the base map via {@link unitModuleMap}; required only when the test invokes registered
 *   functions by `FunctionReference` rather than raw `t.run` db access.
 * @returns A {@link UnitConvexHarness} bound to `schema`.
 */
export function createUnitConvex<Schema extends GenericSchema>(
    schema: SchemaDefinition<Schema, boolean>,
    extra?: UnitModuleMap,
): UnitConvexHarness<Schema> {
    return convexTest(schema, unitModuleMap(extra));
}
