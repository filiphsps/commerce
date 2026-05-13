# @nordcom/commerce-cms

CMS package built on Payload CMS 3.x. Embedded into `apps/admin`; consumed by both `apps/admin` (editor UI) and `apps/storefront` (read-side via Payload's Local API).

## Running tests

Integration tests boot Payload against MongoDB. They require a writable Mongo and write to suite-suffixed databases (`test_<suite>_<timestamp>`).

### Local MongoDB (default)

By default, tests connect to `mongodb://localhost:27017/test`. The simplest setup:

```bash
docker run -d --name mongo-test -p 27017:27017 mongo:7
# …or use any other local Mongo install
```

Then:

```bash
pnpm dotenv -c -- vitest run packages/cms
```

### Remote MongoDB (override)

To run tests against a managed Mongo (e.g. Atlas), set `MONGODB_URI_TEST` in your shell or `.env.local`:

```bash
MONGODB_URI_TEST="mongodb+srv://…/test" pnpm dotenv -c -- vitest run packages/cms
```

Atlas free tiers often hit `LockTimeout` errors during Payload bootstrap because each boot touches many collections under load. Prefer local Mongo when iterating; reserve remote for CI / final verification on a sized cluster.

### Environment variables consumed in tests

| Variable | Default | Purpose |
|---|---|---|
| `MONGODB_URI_TEST` | `mongodb://localhost:27017/test` | Test database connection. |
| `PAYLOAD_SECRET` | `test-payload-secret` | Payload encryption secret. |
| `NEXTAUTH_SECRET` | `test-nextauth-secret` | Used by the NextAuth → Payload auth bridge. |

The `MONGODB_URI` from `.env.local` (which usually points at the production-like Atlas) is intentionally shadowed by the test setup.
