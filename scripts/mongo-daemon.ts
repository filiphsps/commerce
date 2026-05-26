#!/usr/bin/env tsx
/**
 * Detached daemon entry point. `scripts/predev-mongo.ts` spawns this
 * with { detached: true, stdio: 'ignore' } so it survives `pnpm dev`.
 * Owns the dev mongod pinned to port 27018 and persists at `.mongo-dev/`.
 */
import { register } from 'node:module';

register('@nordcom/commerce-test-mongo/loader', import.meta.url);

const { runDaemon } = await import('@nordcom/commerce-test-mongo');

await runDaemon({
    dbPath: new URL('../.mongo-dev', import.meta.url).pathname,
    port: 27018,
    pidFile: new URL('../.mongo-dev/.pid', import.meta.url).pathname,
    uriFile: new URL('../.mongo-dev/.uri', import.meta.url).pathname,
});
