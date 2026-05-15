# @nordcom/commerce-cms

Multi-tenant CMS built on Payload CMS 3.x. Embedded into `apps/admin` (editor UI at `/cms`) and consumed by `apps/storefront` (read-side via Payload's Local API plus a `BlockRenderer`).

## What's in the box

- **Collections** — `pages`, `articles`, `productMetadata`, `collectionMetadata`, `media`, plus three globals modelled as singleton tenant-scoped collections (`header`, `footer`, `businessData`).
- **Access predicates** — `tenantScopedRead` / `tenantScopedWrite` / `adminOnly` / `publicRead` / `isTenantMember` enforce a hard tenant boundary; admins see everything, editors see only their shops, public reads see only published docs.
- **Block model** — 9 block types (`banner`, `alert`, `html`, `media-grid`, `rich-text`, `collection`, `vendors`, `overview`, `columns`) with a single `<BlockRenderer />` dispatch component. Shopify-aware blocks receive injected loaders so the CMS package stays Shopify-agnostic.
- **NextAuth → Payload auth bridge** — `buildNextAuthStrategy` reads a NextAuth JWT cookie, verifies via `jose`, and maps Shop collaborator membership to Payload roles via `computeRolesFromShopMembership`.
- **Shop → tenant sync hook** — `attachShopSync(Shop.model, payload)` listens on the Mongoose `Shop` model's `post('save')` and upserts a matching `tenants` doc, so creating a shop in the admin app immediately makes a tenant available in the CMS.
- **Cache invalidation** — every content collection's `afterChange` / `afterDelete` hooks call `revalidateTag` with the right per-tenant, per-collection, per-handle tags.
- **Query API** — `getPage`, `getArticle`, `getArticles`, `getHeader`, `getFooter`, `getBusinessData`, `getProductMetadata`, `getCollectionMetadata`, `resolveLink`. All return the singleton `Payload` instance from `getPayloadInstance` so the storefront never opens its own DB connection.

## Embedding in another app

```ts
// apps/myapp/src/payload.config.ts
import { buildPayloadConfig } from '@nordcom/commerce-cms/config';
import { buildNextAuthStrategy } from '@nordcom/commerce-cms/auth';

export default buildPayloadConfig({
    secret: process.env.PAYLOAD_SECRET!,
    mongoUrl: process.env.MONGODB_URI!,
    includeAdmin: true,
    enableStorage: true, // reads S3_* env if set
    authStrategies: [
        buildNextAuthStrategy({
            secret: process.env.NEXTAUTH_SECRET!,
            cookieName: 'next-auth.session-token',
            findOrCreateUser: ...,
            recomputeRoles: ...,
        }),
    ],
    disablePasswordLogin: true,
});
```

Then wrap your Next.js config:

```js
// next.config.js
import { withPayload } from '@payloadcms/next/withPayload';
export default withPayload(config);
```

…and mount the routes by re-exporting from `@payloadcms/next/views`:

```ts
// src/app/(payload)/cms/[[...segments]]/page.tsx
export { RootPage as default } from '@payloadcms/next/views';
```

`apps/admin` is the reference implementation — copy that wiring.

## Required environment variables

| Variable                   | Required? | Purpose                                                                |
| -------------------------- | --------- | ---------------------------------------------------------------------- |
| `PAYLOAD_SECRET`           | yes       | Payload session + preview cookie signing.                              |
| `MONGODB_URI`              | yes       | Mongo connection (Payload + the shared `@nordcom/commerce-db` models). |
| `NEXTAUTH_SECRET`          | yes       | Verifies NextAuth JWTs in the auth bridge (falls back to `AUTH_SECRET`). |
| `NORDCOM_OPERATOR_EMAILS`  | no        | Comma-separated emails escalated to Payload `admin` role.              |
| `STOREFRONT_BASE_URL`      | no        | Base URL used by the admin live-preview iframe. Default `http://localhost:1337`. |
| `STOREFRONT_PREVIEW_SECRET`| yes (prod)| Secret expected by the storefront's `/[domain]/api/cms-preview` route. |
| `S3_BUCKET`                | no        | When all five S3_* vars are set, media uploads land in S3.             |
| `S3_ENDPOINT`              | no        |                                                                        |
| `S3_REGION`                | no        |                                                                        |
| `S3_ACCESS_KEY_ID`         | no        |                                                                        |
| `S3_SECRET_ACCESS_KEY`     | no        |                                                                        |

If any S3 var is missing, `storagePluginFromEnv` returns `null` and Payload uses its default disk storage. Set all five together.

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
pnpm dotenv -c -- vitest run --project @nordcom/commerce-cms
```

### Remote MongoDB (override)

To run tests against a managed Mongo (e.g. Atlas), set `MONGODB_URI_TEST` in your shell or `.env.local`:

```bash
MONGODB_URI_TEST="mongodb+srv://…/test" pnpm dotenv -c -- vitest run --project @nordcom/commerce-cms
```

Atlas free tiers often hit `LockTimeout` errors during Payload bootstrap because each boot touches many collections under load. Prefer local Mongo when iterating; reserve remote for CI / final verification on a sized cluster.

### Environment variables consumed in tests

| Variable           | Default                                | Purpose                                              |
| ------------------ | -------------------------------------- | ---------------------------------------------------- |
| `MONGODB_URI_TEST` | `mongodb://localhost:27017/test`       | Test database connection.                            |
| `PAYLOAD_SECRET`   | `test-payload-secret`                  | Payload encryption secret.                           |
| `NEXTAUTH_SECRET`  | `test-nextauth-secret`                 | Used by the NextAuth → Payload auth bridge tests.    |

The `MONGODB_URI` from `.env.local` is intentionally shadowed by the test setup so dev data is never touched.

## Generating types

Payload generates a single `payload-types.ts` from the live config. Re-run after schema changes:

```bash
pnpm --filter @nordcom/commerce-cms generate:types
```

Output lands at `packages/cms/src/types/payload-types.ts` and is gitignored — consumers wire it into their own tsconfig if they want strict typing on the local API.

## Deployment notes

### First-time setup

1. Set the required env vars above on the admin app's deployment target.
2. Deploy admin first — its first request boots Payload, which auto-creates collection indexes against the configured Mongo.
3. Deploy the storefront. Its `/[domain]/api/cms-preview` route needs `STOREFRONT_PREVIEW_SECRET`; the admin's "preview" button sends `?secret=<value>` against that endpoint to flip Next.js draft mode on.

### Cache tag scheme

CMS-side `afterChange` hooks call `revalidateTag` with three tags per mutation:

```
cms.<tenantId>.<collection>.<key>   # e.g. cms.shop-1.pages.home
cms.<tenantId>.<collection>         # e.g. cms.shop-1.pages
cms.<tenantId>                      # broad sweep for the whole tenant
```

`<key>` is the slug for `pages`/`articles`, the `shopifyHandle` for product/collection metadata, or the doc id for globals. The storefront's read paths attach all three tags so a single mutation invalidates exactly what changed without sweeping the whole site.
