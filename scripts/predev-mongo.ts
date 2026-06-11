#!/usr/bin/env tsx
/**
 * Inert shell of the retired in-process Mongo dev bootstrap. The Mongo test
 * harness package it booted and seeded was deleted in the Convex-migration
 * teardown (TEARDOWN-03) — dev, unit, and e2e runs are
 * Convex-native and need no local mongod. The file only survives because the
 * root `predev`/`prebuild`/`pretest` lifecycle hooks still invoke it;
 * TEARDOWN-06 removes those hooks together with this shell.
 */
console.info('[predev-mongo] in-process Mongo harness removed (Convex migration) — nothing to start');
