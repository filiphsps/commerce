#!/usr/bin/env tsx
/**
 * Detached daemon entry point. `scripts/predev-mongo.ts` spawns this with
 * `detached: true` and redirects stdout/stderr to `.mongo-dev/daemon.log`
 * so failures surface there instead of being lost. Owns the dev mongod
 * pinned to port 27018 and persists at `.mongo-dev/`.
 *
 * Imports `runDaemon` from `@nordcom/commerce-test-mongo/daemon` rather
 * than the package barrel — the barrel re-exports the seed helpers, whose
 * import chain evaluates `@nordcom/commerce-db` and throws when
 * `MONGODB_URI` is unset (which is the case here, since mongod hasn't been
 * started yet).
 */
import { runDaemon } from '@nordcom/commerce-test-mongo/daemon';

await runDaemon({
    dbPath: new URL('../.mongo-dev', import.meta.url).pathname,
    port: 27018,
    pidFile: new URL('../.mongo-dev/.pid', import.meta.url).pathname,
    uriFile: new URL('../.mongo-dev/.uri', import.meta.url).pathname,
});
