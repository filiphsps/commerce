#!/usr/bin/env tsx
/**
 * Inert shell of the retired detached Mongo daemon entry point. The Mongo test
 * harness package that provided `runDaemon` was deleted in the
 * Convex-migration teardown (TEARDOWN-03), so there is no daemon left
 * to run. The file only survives because the root `dev:mongo` script still
 * resolves it; TEARDOWN-06 removes the script together with this shell.
 */
console.info('[mongo-daemon] in-process Mongo daemon removed (Convex migration) — nothing to run');
