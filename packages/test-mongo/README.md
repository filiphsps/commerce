# `@nordcom/commerce-test-mongo`

In-process MongoDB lifecycle + canonical fixtures for Playwright E2E and
`pnpm dev` without an external Mongo.

## API

```ts
import { startMongo, seedCanonical, seedShop, seedCms } from '@nordcom/commerce-test-mongo';

// Ephemeral (E2E).
const { uri, stop } = await startMongo();
process.env.MONGODB_URI = uri;
await seedCanonical(uri);
// ... run tests ...
await stop();

// Persistent (dev daemon — usually invoked by the CLI).
import { runDaemon } from '@nordcom/commerce-test-mongo';
await runDaemon({ dbPath: '.mongo-dev', port: 27018, pidFile: '.mongo-dev/.pid', uriFile: '.mongo-dev/.uri' });
```

## CLI

`pnpm exec test-mongo {start|stop|reset|seed}`. Used by `pnpm dev:mongo` /
`pnpm dev:reset` at the root.

## `server-only` stub

Importing `@nordcom/commerce-cms/api` from a Node-side context (Playwright,
the dev CLI) trips the `server-only` package's unconditional throw. Two
hooks live here:

- `@nordcom/commerce-test-mongo/loader` — the `module.register` resolver hook.
- `@nordcom/commerce-test-mongo/register` — a tiny wrapper that registers the hook.

Use the latter via `NODE_OPTIONS='--import @nordcom/commerce-test-mongo/register'`.

## Version pinning

The mongod binary version is pinned by `process.env.MONGOMS_VERSION`
(default `8.0.4`). Set `MONGOMS_DOWNLOAD_DIR` to control the binary cache
location — CI uses `/home/runner/.cache/mongodb-binaries`.

## Replica set, not standalone

Payload's `afterChange` hooks use multi-document transactions. We boot a
single-node `MongoMemoryReplSet` with WiredTiger so transactions work. If a
future Payload version needs a real multi-node setup, bump `replSet.count`
in `src/start.ts`.
