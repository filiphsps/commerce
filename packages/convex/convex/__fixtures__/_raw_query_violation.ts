/**
 * Deliberately-failing lint fixture for the CONVEXCORE-10 barrel gate.
 *
 * It imports the raw `query` builder straight from `_generated/server` — the RLS-bypassing path the
 * `noRestrictedImports` rule forbids in every Convex app/db module. `biome lint` MUST report this import
 * as `lint/style/noRestrictedImports`; swapping the import to `tenantQuery`/`systemQuery` from the
 * `_constructors` barrel (`../_constructors`) clears the diagnostic.
 *
 * The leaf filename begins with an underscore so Convex codegen never registers it as a function (the
 * same exemption the sibling `_constructors.ts` barrel relies on) and the push path-validator — which
 * rejects hyphens — accepts it. The whole `__fixtures__/` directory is also excluded from the project
 * lint set, so this documents the banned pattern without turning the CI gate red.
 *
 * The imported builder is re-exported (rather than left unused) so the SOLE diagnostic is the
 * restricted-import one, never an unused-import one.
 */

import { query } from '../_generated/server';

export const rawQueryViolationFixture = query;
