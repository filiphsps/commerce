# Mongo Teardown Inventory — Zero-Leftover Acceptance Gate

Companion to [`spec.md`](./spec.md) and [`plan.md`](./plan.md). This is the **acceptance gate** for the claim "no Mongo leftovers." It merges all five teardown audits (deps-packages, code-data-layer, tooling-lifecycle, test-e2e-harness, env-ci-infra) and the adversarial critic's missed items into one per-modality inventory, the leftover-trap catalogue, copy-pasteable verification proofs, and a binary Definition-of-Done checklist.

**Teardown actions (legend):** `delete` (remove entirely) · `edit` (modify in place) · `replace-dep` (swap dependency) · `migrate-fixture` (port data/behavior to Convex) · `remove-hook` (drop a lifecycle/runtime hook).

**Read this first — three structural facts the inventory hinges on:**

1. **Two independent Mongo backends hit the same database.** (a) `@nordcom/commerce-db`'s hand-rolled Mongoose layer (`packages/db/src/db.ts` top-level `mongoose.connect`), and (b) Payload's `mongooseAdapter` (`packages/cms/src/config/index.ts:221`). They are separate seams and **both** must move. Removing one does not remove Mongo.
2. **Two mongoose majors coexist.** Direct `mongoose@9.6.3` (db, test-mongo, root) **and** transitive `mongoose@8.22.1` pulled by `@payloadcms/db-mongodb` (→ `mongodb@6.20.0` + `bson@6.10.4` + `mongoose-paginate-v2` + `mongoose-lean-virtuals`). Removing only the direct `9.6.3` leaves the entire 8.x tree alive until the Payload adapter is also cut and `pnpm install` reruns.
3. **CMS-option dependency.** Under the recommended **Option B (drop Payload — see [`cms-decision.md`](./cms-decision.md))**, every `@payloadcms/db-mongodb` / `mongooseAdapter` / `mongoUrl` row below is satisfied **by construction** (Payload is deleted, so the adapter is deleted) rather than by an adapter swap. The current spec/plan §1.2 + Track B + Phase 1 assume Option A (build the adapter); that track is killed — see the cms-decision PLAN IMPACT.

---

## A. Dependencies & packages

| Path | Kind | Role | Teardown | Convex replacement |
|---|---|---|---|---|
| `packages/db/package.json:65` → `mongoose@9.6.3` | npm dep (prod) | Core driver for `@nordcom/commerce-db`; imported by `db.ts` + every model + services | replace-dep | Convex schema + functions; `@nordcom/commerce-db` becomes a thin wrapper over the generated Convex client |
| `package.json:108` (root devDep) → `mongoose@9.6.3` | npm dep (root dev, **hoist anchor**) | Not imported by root code — hoists mongoose so both apps' `e2e/global-setup.ts` resolve it under pnpm strictness | replace-dep | Remove **after** the e2e global-setups stop importing mongoose; else phantom-dependency break |
| `packages/test-mongo/package.json:54` → `mongoose@9.6.3` | npm dep (prod-of-test-pkg) | Seed code writes fixtures via mongoose models | delete | N/A — seeding moves to Convex mutations |
| `packages/test-mongo/package.json:53` → `mongodb-memory-server@11.2.0` | npm dep | In-process `MongoMemoryReplSet` — the engine behind `pnpm dev` daemon + all e2e | delete | `convex dev` (local backend) for dev/e2e; `convex-test` in-memory for unit |
| `packages/test-mongo/package.json:52` → `@payloadcms/db-mongodb@3.85.0` | npm dep | Boots real Payload against in-memory Mongo to seed CMS fixtures | delete | N/A — CMS fixtures seed via Convex |
| `packages/cms/package.json:129` → `@payloadcms/db-mongodb@3.85.0` (peer) | npm peer | Declares the Mongo adapter the host must provide; wired at `config/index.ts:221` | replace-dep | **Option B:** remove with Payload entirely (no Convex Payload adapter exists) |
| `packages/cms/package.json:146` → `@payloadcms/db-mongodb@3.85.0` (dev) | npm dev | Local copy of the peer for typecheck/test | replace-dep | Remove alongside the peer |
| `apps/admin/package.json:66` → `@payloadcms/db-mongodb@3.85.0` | npm dep (prod) | Runtime Mongo adapter for the admin Payload app | replace-dep | Remove; drop `mongoUrl`/`MONGODB_URI` plumbing in `payload.config.ts` |
| `package.json:96` (root devDep) → `@nordcom/commerce-test-mongo` (`workspace:*`) | workspace link | Consumed by `scripts/predev-mongo.ts` + `mongo-daemon.ts` + lifecycle hooks | delete | Remove when test-mongo deleted |
| `apps/admin/package.json:60` → `@nordcom/commerce-test-mongo` (`workspace:*`) | workspace link (declared prod, used test-only) | `/register` ESM loader for admin e2e (`test:e2e` NODE_OPTIONS) | delete | Remove + edit the `test:e2e` NODE_OPTIONS line |
| `apps/storefront/package.json:63` → `@nordcom/commerce-test-mongo` (`workspace:*`) | workspace link (declared prod, used test-only) | `/register-seed-loaders` for storefront e2e + fixtures | migrate-fixture | Rewrite fixtures as Convex mutations; drop loader import + script line |
| `packages/test-mongo/` (**entire workspace package** `@nordcom/commerce-test-mongo`) | workspace package | Self-contained in-process Mongo harness (cli/daemon/start, 4 `.mjs` loaders, seed/* + fixtures/*). **No production-runtime consumer** | delete | New `@nordcom/commerce-test-convex` wrapping `convex-test` + a local-backend launcher + seed mutations |
| `packages/db/` (`@nordcom/commerce-db`) | workspace package (**mongoose host, NOT deletable**) | The single data-access surface; consumed `workspace:*` by storefront, admin, **docs** (no direct mongo dep), cms, test-mongo | migrate-fixture | Re-home onto Convex behind the **same** export surface so ~183 importers change minimally |
| `pnpm-workspace.yaml:17` → `allowBuilds: mongodb-memory-server: true` | workspace manifest | Whitelists the mongod-binary postinstall (inert today — `.npmrc ignore-scripts=true`) | edit | Drop the key once the dep is gone |
| `pnpm-lock.yaml` (mongo-family snapshots) | lockfile | `mongoose@9.6.3` + transitive `mongoose@8.22.1`; `mongodb@7.2.0`+`6.20.0`; `bson`; `mongodb-memory-server@11.2.0`; `@mongodb-js/saslprep`; `mongodb-connection-string-url` | edit | Prune via `pnpm install` after manifest edits; verify no `mongo*/bson/mongoose*` snapshot remains |

---

## B. Code: data layer (`packages/db`) & Payload/CMS adapter seam

| Path | Kind | Role | Teardown | Convex replacement |
|---|---|---|---|---|
| `packages/db/src/db.ts` | runtime module | Top-level `await mongoose.connect(MONGODB_URI)` exported as `db`; defines `BaseDocument`/`BaseTimestamps`; reads/throws on `MONGODB_URI` | delete (rewrite) | Lazy `ConvexHttpClient(CONVEX_URL)` (server-only); `BaseDocument`→`Doc<'table'>`; `id`←`_id`, `createdAt`←`_creationTime`, explicit `updatedAt`. `MONGODB_URI` read disappears |
| `packages/db/src/index.ts` | barrel | Re-exports `./db`, `./models`, `./services`, `./lib/*`, type helpers | edit | Drop `./db` + `./models`; keep `lib/*` + type helpers verbatim; repoint `./services` to Convex |
| `packages/db/src/models/shop.ts` | mongoose schema+model | Largest schema (domain unique, `alternativeDomains` index, theme/design/commerceProvider/collaborators(ref User)/featureFlags(ref FeatureFlag)); ShopBase/OnlineShop types | delete | `shops` `defineTable` + `by_domain`/`by_alternativeDomains`; refs→`v.id(...)`; **keep the TS types** (many importers) |
| `packages/db/src/models/user.ts` | mongoose schema+model | Unique email, embedded `identities`, `virtuals:true` for the `id` virtual (Auth.js) | delete | `users` + `by_email`; `_id` native (virtual workaround moot); keep `UserBase` |
| `packages/db/src/models/review.ts` | mongoose schema+model | Embeds the **full ShopSchema** as `shop`; ReviewBase | delete | `reviews` storing `shopId: v.id('shops')` (kills the denormalization-drift class); keep `ReviewBase` |
| `packages/db/src/models/session.ts` | mongoose schema+model | token/expiresAt/`user` ref; backs Auth.js session create | delete | `sessions` + `user: v.id('users')` + `by_token`; keep `SessionBase` |
| `packages/db/src/models/identity.ts` | mongoose schema+model | OAuth link + compound unique `{provider,identity}`; backs Auth.js linkAccount | delete | `identities` + `by_provider_identity`; **uniqueness enforced in the mutation** (Convex has no DB-level unique); keep `IdentityBase` |
| `packages/db/src/models/feature-flag.ts` | mongoose schema+model | key unique, Mixed `defaultValue`/`targeting`/`option`; JsonValue/TargetingRule types | delete | `featureFlags` + `by_key`; Mixed→`v.any()`/JsonValue validator; **keep the JSON types** (storefront + CMS import them) |
| `packages/db/src/models/index.ts` | barrel | Re-exports all models + `ModelsSession` | delete | Removed with the models |
| `packages/db/src/services/service.ts` | service base | Generic Mongoose CRUD `Service<DocType,M>`; `NotFoundError`-on-empty-single contract; lazy `db.models[name]` | edit | Rewrite body against Convex while **preserving signatures + NotFoundError contract** (Auth.js adapter + `findByDomain` depend on it) |
| `packages/db/src/services/shop.ts` | service | `findById`/`findByCollaborator`/`findByDomain` (`$or` domain/alternativeDomains, populate, projection, secret masking, error-throwing) — hostname→tenant resolver on every storefront req | edit | Convex queries: `$or`→two indexed lookups merged; `populate`→`ctx.db.get` fan-out; preserve masking via `docToOnlineShop` |
| `packages/db/src/services/user.ts` · `session.ts` · `identity.ts` | service bindings | Thin `new Service(Model)` bindings backing the Auth.js adapter | edit | Rebind to Convex-backed Service per table; `identity` provides the upsert equivalent |
| `packages/db/src/services/review.ts` | service | `findByShop` + `findAll({tenant})` (filters a **non-existent** `tenant` field today) | edit | Convex `reviews` `by_shop`; **resolve the dead `tenant` filter intent, don't copy it** |
| `packages/db/src/services/feature-flag.ts` | service | `findByKey`/`findAll`, server-only | edit | Convex `featureFlags` `by_key` |
| `packages/db/src/services/index.ts` | barrel | Re-exports all six services | edit | Keep barrel; repoint to Convex modules |
| `packages/db/src/lib/doc-to-shape.ts` | serializer | `stripInternals` (`_id`/`__v`→string `id`); `docToOnlineShop` **MASKS** `commerceProvider.authentication.token` + `customers.clientSecret` | edit | Deep `_id`/`__v` strip mostly evaporates (Convex string `_id`, no `__v`); **KEEP credential masking verbatim** (load-bearing, Convex-agnostic) |
| `packages/db/src/lib/feature-flag.ts` | pure leaf (Mongoose-FREE) | FeatureFlagKind + section-flag key namespace; imported by CMS + storefront | edit | Survives verbatim; only barrel path may change |
| `packages/db/src/lib/theme.ts` | pure leaf (Mongoose-FREE) | theme token allowlist + `resolveTheme` + 35+ token types the Shop schema mirrors | edit | Survives; the Convex `shops.theme` validator must mirror these |
| `packages/db/src/lib/theme-catalog.ts` | pure leaf (Mongoose-FREE) | product-card token catalog + ValueKind | edit | Survives verbatim |
| `packages/db/src/@types/declaration.d.ts` | type declaration | `declare global { var mongoose }` ambient | delete | N/A |
| `packages/cms/src/config/index.ts:1,221` | Payload adapter wiring (**primary CMS seam**) | `import { mongooseAdapter }` + `db: mongooseAdapter({ url: mongoUrl })`; `filterAvailableLocales` assumes ObjectId (`'text'` idType) | replace-dep | **Option B:** remove the `db:` adapter + `mongoUrl` option + the ObjectId idType assumption with Payload |
| `packages/cms/src/api/get-payload-instance.ts:27` | Payload boot | Module-singleton boot; `mongoUrl: process.env.MONGODB_URI ?? ''` (empty-string fallback) | edit | **Option B:** replaced by a Convex client read path; drop `?? ''` |
| `packages/cms/src/test-utils/build-test-config.ts:1,50` | Payload adapter wiring (test) | `db: mongooseAdapter({ url })`; **ZERO current test consumers** but keeps the dep alive | replace-dep / delete | Convex test harness, or delete |
| `packages/cms/src/types/generate-types-config.ts:32` | codegen config | Hardcodes `mongodb://localhost:27017/generate-types-only` for `cms:gen`; **ignores `MONGODB_URI`** so it survives env teardown | edit | **Option B:** Convex codegen (`convex codegen`); `payload-types.ts` generation retires |
| `packages/cms/src/api/resolve-tenant-id.ts` | tenant bridge (**critic-found, READ-path half**) | `Shop._id → Tenant._id` bridge (`where: { shopId: { equals } }`), WeakMap cache, "avoid extra Mongo round-trip" comment; storefront `where: { tenant }` filters depend on it | edit/delete | Rework with the tenant migration; if missed, **every storefront CMS read returns null** |
| `packages/cms/src/shop-sync/post-save-hook.ts` | mongoose hook (WRITE-path half) | `schema.post('save')` upserts the Payload `tenants` mirror (WeakSet idempotency) | remove-hook | No save hooks in Convex; unify shops+tenants → delete the sync; else a Convex mutation writes both atomically |
| `packages/cms/src/shop-sync/index.ts` | barrel | Re-exports `attachShopSync`/`syncShopToTenant` | edit/delete | Repoint or delete with the hook |
| `apps/admin/src/payload.config.ts:23,67` | app wiring | Reads/throws `MONGODB_URI`; `mongoUrl: MONGODB_URI`; `attachShopSync(Shop.model …)` reaches into the Mongoose model | edit | Drop `MONGODB_URI` + `mongoUrl`; `Shop.model` won't exist under Convex — rework attachShopSync mechanism |
| `apps/admin/src/utils/auth.adapter.ts` | auth adapter | Auth.js adapter on commerce-db; `.toObject()`/`User.create().toObject()`/`Session.create({user: await User.find()})`/`Identity.findOneAndUpdate({upsert,new})`/`user.identities.push();user.save()`; not-found→null contract | edit | Rewrite against Convex services; Mongoose-isms→explicit mutations; **preserve not-found→null / infra-error→throw** |
| `apps/admin/src/lib/payload-ctx.ts` | consumer | `getAuthedPayloadCtx`: `payload.find('users'/'tenants')` + `Shop.findByDomain`; reads `doc.id` from stripInternals | edit | `payload.find` rides the mongooseAdapter — moves to Convex queries when Payload's data layer is replaced |
| `apps/admin/src/lib/shops-for-user.ts` | consumer | `Shop.find({filter:{}})` for the shop switcher | edit | Repoint behind the Convex-backed `Shop.find`/list query |
| `apps/storefront/src/api/_normalize-payload.ts` | normalizer (**critic-found ObjectId leak**) | `looksLikeLocaleMap` heuristic assumes `{ id: '<ObjectId>' }` for unpopulated relation stubs | edit | Review against opaque Convex string ids |

---

## C. Tooling & lifecycle (scripts, hooks, runtime state, live processes)

| Path | Kind | Role | Teardown | Convex replacement |
|---|---|---|---|---|
| `scripts/predev-mongo.ts` | lifecycle script | Boots/attaches the `.mongo-dev/` daemon; upserts `MONGODB_URI` into `.env.local`; seeds canonical on first run; records dev PID. Wired to `predev`/`prebuild`/`pretest` | delete | `convex dev` (writes `CONVEX_URL` itself); seeding via a seed mutation / `convex import` |
| `scripts/postdev-mongo.ts` | lifecycle script | Strips the managed `MONGODB_URI` line from `.env.local`. Wired to `postdev`/`postbuild`/`posttest` | delete | N/A — Convex CLI owns `CONVEX_URL` |
| `scripts/mongo-daemon.ts` | lifecycle script | Detached daemon (`runDaemon`) pinning mongod to port 27018; for `dev:mongo` + `pnpm dev` | delete | `convex dev` is the long-lived backend |
| `scripts/clean-mongo.ts` | lifecycle script | Kills orphan `mongodb-memory-server` mongod + removes temp dirs/sockets. Wired to `clean:mongo` | delete | N/A — no MMS orphans under Convex |
| `scripts/dev-reset.ts` | lifecycle script | SIGTERMs dev+daemon, strips `MONGODB_URI`, `rm -rf .mongo-dev/`. `dev:reset` | delete (rewrite) | Convex reset (stop backend + wipe local data) |
| `package.json` (root hooks/scripts) | manifest hooks+deps | `predev`/`postdev` + 4 `postdev:*` delegates, `dev:mongo`, `dev:reset`, `prebuild`/`postbuild`, `pretest`/`posttest`, `clean:mongo` all invoke `*-mongo.ts`; deps `mongoose` + `@nordcom/commerce-test-mongo` | remove-hook / replace-dep | Delete the 8 mongo hooks **atomically with the 4 `postdev:*` delegates**; **KEEP the portless-proxy half of `predev`** (Mongo-independent); drop deps; add `convex` |
| `.mongo-dev/` | runtime state dir (gitignored, **LIVE**) | ~281–274 entries: WiredTiger data + `.pid`/`.dev.pid`/`.uri`/`.seeded`/`.env-managed`/`daemon.log`. A mongod is **actively writing** | delete | Convex local-backend state dir (e.g. `.convex/`). **SIGTERM the live daemon first** or it resurrects markers + holds port 27018 |
| `.gitignore:11` → `.mongo-dev` | gitignore entry | Ignores the runtime dir | edit | Remove `.mongo-dev`; add `.convex/` if self-hosting |
| `.env.local` (gitignored, **LIVE**) | env file | Line 68 `MONGODB_URI=mongodb://127.0.0.1:27018/?replicaSet=testset` + line 21 commented `MONGODB_URI_TEST`. Loaded by `dotenv -c` for every build/test | edit | Strip both lines; add `CONVEX_URL`. Removed only by postdev/dev-reset (being deleted) — **scrub manually** |
| **LIVE processes** (this session) | runtime | `mongo-daemon` pid 10419 → mongod pid 10422 (port 27018) → mongo_killer pid 10423 | delete | SIGTERM via `pnpm dev:reset` (or kill PIDs) **before** deleting any script — the reaper (`clean-mongo.ts`) is itself being deleted |
| `~/.cache/mongodb-binaries/mongod-arm64-darwin-8.0.4` | cached binary (**outside repo**) | The mongod binary MMS auto-redownloads on any `MongoMemoryReplSet.create()` | delete | `rm -rf ~/.cache/mongodb-binaries` (survives every repo-level teardown) |

---

## D. Test & e2e harness

| Path | Kind | Role | Teardown | Convex replacement |
|---|---|---|---|---|
| `packages/test-mongo/src/{start,daemon,cli,index}.ts` | harness core | `MongoMemoryReplSet`, `runDaemon`, `test-mongo` bin, barrel | delete | `convexTest()` (unit) + local Convex backend (e2e); Convex CLI replaces the bin |
| `packages/test-mongo/src/{register-loaders,register-seed-loaders,seed-loader,server-only-loader}.mjs` | ESM loaders | `--import` targets stubbing `server-only` + `next/cache` (referenced by **string** in NODE_OPTIONS — invisible to TS/LSP) | delete | N/A under Convex (no Payload afterChange/revalidate at seed time) |
| `packages/test-mongo/src/seed/shop.ts` | direct-driver seed | Raw `createConnection` + `conn.model('Shop', ShopSchema)`; writes a `contentProvider` field **absent from ShopBase** | migrate-fixture | Convex seed mutation; **decide to add/drop `contentProvider`** (strict validator rejects it) |
| `packages/test-mongo/src/seed/canonical.ts` | seed orchestrator | `seedShop` → raw `collection('shops').findOne` for `_id` → `seedCms` | migrate-fixture | One Convex seed run; `String(_id)` becomes a native Convex Id |
| `packages/test-mongo/src/seed/cms.ts` | payload seed | Boots Payload; seeds header/footer/businessData/pages/articles; **encodes the shopId↔tenantId mapping** | migrate-fixture | Convex seed mutations; **must preserve shopId↔tenantId or storefront CMS reads 404** |
| `packages/test-mongo/src/seed/fixtures/*` (articles, business-data, collection-metadata, feature-flags, footer, header, lexical, pages, product-metadata — ~2,243 lines) | seed fixtures | Pure DB-agnostic TS (only intra-import is `./lexical`) | migrate-fixture | Ported essentially **verbatim**; only the insert call changes (feature-flags drops the `JSON.stringify`-for-Monaco quirk); `lexical.ts` survives **iff** richtext stays Lexical |
| `packages/test-mongo/src/{canonical,cms,shop,start,cli}.test.ts` | harness tests | Integration tests vs live replSet/Payload | delete | `convex-test` seed assertions; start/cli tests N/A |
| `packages/test-mongo/{vitest.setup,vitest.config,vite.config}.ts` | configs | MMS timeouts/serialization; externalize mongoose/mongodb/MMS/payload; pin `MONGOMS_VERSION 8.0.4` | delete | Standard configs for the Convex seed package |
| `packages/db/vitest.setup.ts` | test mock | `vi.mock('mongoose')` (real `Schema`, mocked `connect`) + `vi.stubEnv('MONGODB_URI')` + server-only stub. **Re-imports REAL mongoose via `importActual`** — keeps it resolvable after `db.ts` deletion | edit | `convex-test` setup; remove the mongoose mock + URI stub |
| `packages/cms/vitest.setup.ts` | test mock | `vi.stubEnv('MONGODB_URI')` + `PAYLOAD_SECRET` + server-only/next/cache stubs | edit | Drop URI stub; **Option B:** next/cache + server-only stubs unnecessary |
| `apps/admin/vitest.setup.ts` | test mock | `vi.mock('mongoose')` (fake `connect().model().find()→[]`) + `vi.stubEnv('MONGODB_URI','mongodb+srv://dummy-string')` | edit | Convex-test mocks; remove mongoose mock + URI stub |
| `apps/storefront/vitest.setup.ts` | test mock | `vi.mock('@nordcom/commerce-db')` returning real theme + a **Mongoose-shaped** `Shop.findByDomain` mock | edit | Mock the Convex-backed shop accessor shape instead |
| `apps/admin/src/utils/auth.adapter.test.ts` | unit test | `import mongoose` + `mongoose.model('UserToObjectTest', UserSchema)` (no connection) | edit | Plain objects / Convex doc shapes; remove the mongoose import |
| `apps/storefront/e2e/global-setup.ts` | e2e global setup | Registers seed-loader; `seedCanonical(uri)`; raw `mongoose.createConnection` to read `shops._id` → exports `E2E_TENANT_ID` | migrate-fixture | Convex seed mutation + a Convex query for the id; drop seed-loader register + mongoose import. **Must still emit `E2E_TENANT_ID`** |
| `apps/admin/e2e/global-setup.ts` | e2e global setup | `seedCanonical`; raw driver: inline User/PayloadUser schemas, upsert user, `shops.collaborators` set, link tenant; mints NextAuth JWT cookie | migrate-fixture | Convex seed mutations for user/collaborator/tenant; **keep the NextAuth cookie logic** (DB-independent) |
| `apps/{storefront,admin}/e2e/global-teardown.ts` | e2e teardown | Re-export the no-op `globalTeardown` | edit | Keep no-op (or Convex backend teardown) |
| `apps/storefront/e2e/fixtures/seed-shop.ts` · `seed-cms.ts` | e2e fixture wrappers | Re-export `seedShop`; wrap `seedCms` asserting `MONGODB_URI` | migrate-fixture | Re-export/wrap Convex seed helpers; drop URI guard |
| `apps/{storefront,admin}/package.json` `test:e2e` | package script | `NODE_OPTIONS='--import @nordcom/commerce-test-mongo/register[-seed-loaders]' playwright test` — **`--import` 404s the instant the package is deleted, crashing Playwright before any spec** | edit | `playwright test` with no loader |
| `apps/{storefront,admin}/playwright.config.ts` | playwright config | `webServer: pnpm dev/start` boots mongo transitively via `predev` | edit (if lifecycle changes) | webServer against Convex |
| `packages/cms/src/test-utils/seed.ts` · `index.ts` | test utils | `seedTenant()` via `payload.create`; barrel | edit | **Option B:** Convex tenants insert |

---

## E. Env, CI & infra

| Path | Kind | Role | Teardown | Convex replacement |
|---|---|---|---|---|
| `.env.example:31` (root) | env template | `MONGODB_URI=` under "# Database." | edit | `CONVEX_URL` / `CONVEX_DEPLOY_KEY` (+ `NEXT_PUBLIC_CONVEX_URL`) |
| `apps/storefront/.env.example:3` | env template | `MONGODB_URI=mongodb://localhost:27017/commerce` | edit | `NEXT_PUBLIC_CONVEX_URL` / `CONVEX_URL` |
| `apps/admin/.env.example:4` | env template | `MONGODB_URI=mongodb://localhost:27017/commerce` | edit | `NEXT_PUBLIC_CONVEX_URL` / `CONVEX_URL` / deploy key |
| `.github/workflows/ci.yml:22-23` + cache wirings | ci workflow | `MONGOMS_VERSION: 8.0.4` + `MONGOMS_DOWNLOAD_DIR`; `mongo-binary-cache-hit` threaded through lint/typecheck/test/build/e2e; `save-mongo-binary` on the test job. (e2e job is `if: false`) | edit | Remove both env vars + all cache wirings; `convex-test` runs in-process (no binary). Add `CONVEX_DEPLOY_KEY`/`CONVEX_URL` only if integration tests target a real deployment |
| `.github/common/bootstrap/action.yml:16-18,66-75` | composite action (**shared by ci/deploy/release/docs**) | Output `mongo-binary-cache-hit` + the MMS-binary restore step | edit | Remove output + step. **Editing only ci.yml leaves deploy/release/docs still restoring the cache** |
| `.github/common/bootstrap-save/action.yml:12-15,24-27,49-54` | composite action | Inputs `mongo-binary-cache-hit` + `save-mongo-binary` + the MMS-binary save step | edit | Remove inputs + step |
| `pnpm-lock.yaml` | lockfile | 32 mongo entries across two mongoose majors + drivers + MMS | edit | Regenerate via `pnpm install`; CI's `--frozen-lockfile` fails on a stale lock |
| `packages/cms/src/config/index.ts:221` | config wiring | `db: mongooseAdapter({ url: mongoUrl })` | replace-dep | **Option B:** fork/migration point — removed with Payload |
| `apps/admin/src/payload.config.ts:23-26,67` | env gate | Reads `MONGODB_URI`, throws if unset; `mongoUrl: MONGODB_URI` | edit | Read Convex vars; drop adapter wiring |
| `packages/db/src/db.ts:58-59` | env gate | `MONGODB_URI` read + `MissingEnvironmentVariableError` | edit | `ConvexHttpClient(CONVEX_URL)` init; no module-load connect |
| `packages/cms/src/api/get-payload-instance.ts:27` | env default | `mongoUrl: process.env.MONGODB_URI ?? ''` | edit | Convex client; drop `?? ''` |
| `packages/cms/src/test-utils/build-test-config.ts:44` | env default | `?? 'mongodb://localhost:27017/test'` — silently re-points to a default mongod | edit | convex-test harness; remove the default |
| `packages/{cms,db}/vitest.setup.ts` · `apps/admin/vitest.setup.ts` · `packages/test-mongo/vitest.setup.ts` | vitest env stubs | `vi.stubEnv('MONGODB_URI', …)` | edit/delete | Drop or stub `CONVEX_URL` |
| `turbo.json` | task config | **No** Mongo passthrough (`globalPassThroughEnv: ['NODE_ENV']`); `MONGODB_URI` reaches tasks via `dotenv -c` + `--env-mode=loose` | (none) | Wire Convex URL the same loose way or server code gets `undefined` — no per-task array to edit |
| `apps/*/vercel.json` | deploy config | **No** Mongo/DB env (set in Vercel dashboard, out of repo) | (none) | Convex URL/deploy-key live in Vercel project settings |
| docker-compose / Dockerfile / terraform / fly.toml / render.yaml | — | **Confirmed: none exist** | (none) | N/A — Mongo lifecycle is entirely npm-dep + lockfile + scripts + CI-cache driven |

---

## F. Critic's missed items (docs, MCP, build artifacts, gates)

| Path | Kind | Role | Teardown | Convex replacement |
|---|---|---|---|---|
| `CONTEXT.md:77,273,278` | domain doc (**canonical per CLAUDE.md**) | Describes Mongoose Shop as "authoritative write path", OnlineShop-vs-Shop split, 3-shop-rep glue. Omitted by all 5 audits | edit | Rewrite for Convex; else every future agent re-learns the Mongoose model |
| `CLAUDE.md:16,38` | agent instructions | "E2E + `pnpm dev` use an in-process MongoDB … `.mongo-dev/` … `dev:reset`"; "New tenant = row in `shops` MongoDB collection" | edit | After teardown these reference **deleted scripts** and actively mislead agents |
| `README.md` + `apps/{admin,storefront}/README.md` + `packages/{cms,db,test-mongo}/README.md` | hand-written docs (git-tracked **sources**, not generated) | Describe Mongo. Audits flagged only the **generated** tree | edit/delete | Rewrite/remove; then `pnpm gen` self-heals the gitignored `apps/docs/content/**` + `apps/docs/api/**` |
| `apps/storefront/docs/routing.mdx` · `packages/cms/docs/{api,collections,editor/overview}.mdx` · `packages/db/docs/{models,overview,services}.mdx` | hand-written doc sources | Feed the docs generator; describe Mongo models/services | edit | Rewrite for the Convex data layer |
| `packages/db/dist/**` · `packages/cms/dist/**` | compiled artifacts (gitignored, **on-disk**) | Apps import packages from built `dist/`, not source — these hold **compiled mongoose/mongooseAdapter** | delete (rebuild) | `rm -rf packages/*/dist` then `pnpm build:packages`; else stale mongoose dist keeps serving every app |
| `*.tsbuildinfo` (root, `packages/cms`, `packages/test-mongo`, …) | incremental caches | Hold a stale mongo type graph | delete | `find … -name '*.tsbuildinfo' -delete` |
| `.turbo` / `packages/*/.turbo` / `apps/*/.turbo` | turbo caches | Can keep serving the old mongo-backed harness after source deletion | delete | `rm -rf .turbo packages/*/.turbo apps/*/.turbo` + cache bust |
| `mongodb-mcp-server@1` (pids 7213/6880/878/490) | **MCP server (outside repo dep graph)** | 4 running processes connecting to MongoDB, wired via Claude/IDE MCP settings | remove-hook | Remove the MCP wiring from Claude/IDE settings — survives every repo-level teardown |
| `apps/docs/lib/source-meta.generated.ts` · `symbol-index.generated.json` · `.next/dev/routes-manifest.json` | generated docs artifacts | Contain `/(generated)/test-mongo` → `/packages/test-mongo` rewrites | (regenerate) | Self-heal on `pnpm gen` **after** sources + db/cms package source migrate |
| `.changeset/config.json` | changeset gate | `ignore: ['@nordcom/*','!@nordcom/cart-*']` | (none) | **Confirmed: NO changeset required** — all touched packages match `@nordcom/*` and none are `cart-*`. Don't add one; deleting test-mongo needs no config edit |
| `codecov.yml:91` | coverage config | Only a `pkg-db` component (no test-mongo component) | (none) | `pkg-db` survives (db is re-homed, not deleted). Non-issue — flagged so reviewers don't hunt |
| `.npmrc` → `ignore-scripts=true` | install config | Suppresses MMS postinstall, making `pnpm-workspace.yaml` allowBuilds **inert**; binary fetched lazily into `~/.cache` | (none) | Removing allowBuilds changes nothing on disk; the cached binary must be deleted separately |

---

## Leftover-traps list (merged, deduped)

**Dependency-graph traps**
1. **Second mongoose major hides behind Payload.** `@payloadcms/db-mongodb@3.85.0` pulls `mongoose@8.22.1` → `mongodb@6.20.0` + `bson@6.10.4` + `mongoose-paginate-v2` + `mongoose-lean-virtuals`. Removing only direct `9.6.3` leaves this entire tree until Payload's adapter is cut and `pnpm install` reruns.
2. **Root mongoose is a HOIST ANCHOR, not a consumer.** Both apps' `e2e/global-setup.ts` `import mongoose` without declaring it. Deleting root `mongoose` before migrating those files → phantom-dependency break under pnpm strictness.
3. **test-mongo is in `dependencies`, not `devDependencies`,** of both apps despite being test-only — a "remove devDeps" sweep misses it. It survives unless the two `test:e2e` NODE_OPTIONS `--import` strings are also edited.
4. **Phantom `workspace:*` links.** Deleting test-mongo without removing all 4 referrers (root:96, admin:60, storefront:63, self) hard-fails `pnpm install`. Same risk for commerce-db (5 referrers) if its name/exports change.
5. **`apps/docs` looks mongo-free** but pulls `mongoose@9.6.3` transitively through `@nordcom/commerce-db`.
6. **`pnpm-workspace.yaml allowBuilds: mongodb-memory-server`** is a dangling whitelist that no dep-grep surfaces (and is inert under `.npmrc ignore-scripts=true`).

**Code/test traps**
7. **Four vitest.setup mongoose mocks re-import REAL mongoose via `importActual`** (`packages/db`, `packages/test-mongo`, `apps/admin`) — the easiest place for mongoose to silently survive after `db.ts` is deleted.
8. **`packages/cms/src/test-utils/build-test-config.ts` imports `@payloadcms/db-mongodb` with ZERO test consumers** — a "find usages" sweep finds nothing; the dormant import alone keeps the adapter dep alive.
9. **Hardcoded mongod fallbacks re-introduce a connection after the var is removed:** `build-test-config.ts:44` (`?? 'mongodb://localhost:27017/test'`), `get-payload-instance.ts:27` (`?? ''`), and the vitest stubs (`mongodb+srv://dummy-string`).
10. **`generate-types-config.ts:32` hardcodes `mongodb://localhost:27017/generate-types-only`** and **ignores `MONGODB_URI`** — survives env teardown and still spins a mongoose adapter during `cms:gen`/`cms:gen:check` (CI gate).
11. **`Review.findAll` filters on a `tenant` field absent from the schema** — a dead filter; carry the intent, don't copy it.
12. **`seed/shop.ts` writes a `contentProvider` field absent from ShopBase** — a strict Convex validator rejects it; add or drop deliberately.

**Runtime/state traps (the dangerous ones)**
13. **LIVE teardown-order hazard:** mongod pid 10422 (port 27018, `.mongo-dev`, replSet `testset`) is running with daemon pid 10419 + killer pid 10423. SIGTERM them (`pnpm dev:reset`) **before** deleting `scripts/*-mongo.ts`, or the orphan reaper (`clean-mongo.ts`) — itself being deleted — leaves an orphan mongod holding port 27018.
14. **`.mongo-dev/` is gitignored** (~274–281 live entries) — `git grep`/`git clean` never surface it; `rm -rf` manually after killing the live PID.
15. **`.env.local:68` carries a live managed `MONGODB_URI`** stripped only by postdev/dev-reset (being deleted). Delete the scripts first and the stale line persists forever, silently pointing app code at a dead port.
16. **Cached mongod binary at `~/.cache/mongodb-binaries`** is **outside** `.mongo-dev/` and survives every repo teardown; MMS auto-redownloads it the moment any leftover `MongoMemoryReplSet.create()` runs.
17. **`predev-mongo` rewrites `MONGODB_URI` back into `.env.local`** on the next `pnpm dev`/build/test unless the predev/prebuild/pretest hooks are removed first.
18. **Live `mongodb-mcp-server` MCP processes** (4) connect to MongoDB via Claude/IDE settings — outside the repo entirely.

**Loader/string-reference traps**
19. **`.mjs` ESM loaders are referenced by STRING** — in test-mongo `package.json` `exports`, `register()` calls inside `predev-mongo.ts` + both global-setups, and the `NODE_OPTIONS --import` strings. None appear in the TS import graph; TS/LSP refactor tooling won't flag them. Deleting the package without scrubbing them → `ERR_MODULE_NOT_FOUND` that fires **only under `pnpm test:e2e`**, not unit CI.
20. **Removing scripts but leaving hooks (or vice-versa)** turns `pnpm dev`/`build`/`test` into a hard failure — the 4 `postdev:*` delegates + prebuild/postbuild/pretest/posttest must be removed atomically with the scripts.

**CI/cache traps**
21. **Shared composite action `bootstrap/action.yml` restores the mongo binary cache for ci/deploy/release/docs** — fixing only `ci.yml` leaves 3 workflows restoring it. The fix must be in the composite action.
22. **CI never sets `MONGODB_URI`** (mongo is spawned in-process by MMS) — a reviewer scanning `ci.yml` for `MONGODB_URI` finds nothing and may wrongly assume CI is clean; the real surface is `MONGOMS_*` + the binary cache.
23. **`MONGOMS_VERSION=8.0.4` is pinned in three places** (ci.yml env, `test-mongo/vitest.setup.ts`, `test-mongo/src/start.ts` default `?? '8.0.4'`) — partial removal leaves a dangling pin.
24. **Comment drift:** both global-setups' JSDoc claims the daemon is "booted by root `pretest:e2e`/`posttest:e2e`" — **those scripts do not exist**; e2e inherits `MONGODB_URI` from `.env.local`. Don't chase a non-existent hook.

**ObjectId mental-model leaks (silently keep "working" but wrong)**
25. `doc-to-shape` `_id`→`id`; `config/index.ts` `filterAvailableLocales`/`getTenantFromCookie('payload-tenant','text')`; `resolve-tenant-id.ts` `Shop._id→Tenant._id`; `_normalize-payload.ts` `{ id: '<ObjectId>' }` heuristic; e2e `String(doc._id)`. Convex ids are opaque strings — these casts silently keep working but leak the ObjectId model.

**Behavioral/coupling traps**
26. **3-shop-representation glue is behavioral, not grep-able.** The shopId↔tenantId linkage lives inside `seed/cms.ts` + `resolve-tenant-id.ts` + the post-save hook. A Convex seed/migration that inserts shops + CMS docs but skips the tenant↔shop link makes **every storefront CMS read 404/null**.
27. **Stale compiled `dist/` keeps serving mongoose** after the TS source migrates, because apps import from `dist/` per CLAUDE.md — until `pnpm build:packages` reruns.

---

## Verification commands block

Copy-pasteable proofs that zero Mongo remains. **All must pass.** (Run after the full teardown + `pnpm install` + `pnpm build:packages`.)

```bash
# 1. No mongo tokens anywhere in tracked source (specs are append-only history; docs/* is generated)
git grep -InE 'mongo|mongoose|MONGODB_URI|MONGOMS|ObjectId|wiredTiger|replSet' \
  -- ':!pnpm-lock.yaml' ':!.specs/*' ':!apps/docs/*' | grep -v -i 'among\|monger'
echo '^ must be empty'

# 2. Dependency tree carries no mongo family (both mongoose majors + drivers + MMS + adapter)
for p in mongoose mongodb bson mongodb-memory-server @payloadcms/db-mongodb \
         @mongodb-js/saslprep mongodb-connection-string-url; do
  echo "== pnpm why $p =="; pnpm why -r "$p" 2>&1 | tail -3
done
echo '^ every one must report no packages found'

# 3. Lockfile is mongo-free
grep -nE 'mongo|bson|mongoose|saslprep' pnpm-lock.yaml
echo '^ must be empty after pnpm install regenerates the lockfile'

# 4. Frozen install passes (proves lockfile clean AND no phantom root-mongoose hoist needed by e2e)
pnpm install --frozen-lockfile
echo '^ must pass'

# 5. The whole test-mongo workspace package is gone
git ls-files packages/test-mongo | head
echo '^ must be empty'

# 6. No workspace links or NODE_OPTIONS --import loader strings to test-mongo
git grep -In '@nordcom/commerce-test-mongo' -- ':!pnpm-lock.yaml'
echo '^ must be empty (4 workspace:* links + 2 test:e2e --import strings removed)'

# 7. Payload adapter + db.ts connect + admin wiring all gone
git grep -In -e 'mongooseAdapter' -e '@payloadcms/db-mongodb' -e 'mongoUrl' -e 'MONGODB_URI' \
  -- packages/cms/src apps/admin/src packages/db/src
echo '^ must be empty'

# 8. No live mongo/MCP processes (SIGTERM 10419/10422/10423 + remove the mongodb-mcp-server wiring first)
ps aux | grep -iE 'mongod|mongo-daemon|mongo_killer|mongodb-mcp-server' | grep -v grep
echo '^ must be empty'

# 9. Runtime state + cached binary gone
test -d .mongo-dev && echo 'FAIL .mongo-dev present' || echo 'OK .mongo-dev gone'
test -d "$HOME/.cache/mongodb-binaries" && echo 'FAIL binary cache present' || echo 'OK binary cache gone'

# 10. Env templates + machine-local env clean
grep -RnE 'MONGODB_URI|MONGODB_URI_TEST' .env.example apps/*/.env.example .env.local 2>/dev/null
echo '^ must be empty across all env templates AND .env.local'

# 11. CI clean in ci.yml AND both shared composite actions (covers deploy/release/docs)
git grep -InE 'MONGOMS|mongodb-binaries|mongo-binary-cache-hit|save-mongo-binary' -- .github
echo '^ must be empty'

# 12. pnpm-workspace allowBuilds entry removed
git grep -In 'mongodb-memory-server' -- pnpm-workspace.yaml
echo '^ must be empty'

# 13. Compiled dist the apps actually import carries no mongoose (AFTER rebuild)
find . \( -path '*/packages/db/dist/*' -o -path '*/packages/cms/dist/*' \) -name '*.js' 2>/dev/null \
  | xargs rg -l 'mongoose|mongooseAdapter' 2>/dev/null
echo '^ must be empty'

# 14. Purge stale incremental + turbo + dist caches, then rebuild clean
find . -name '*.tsbuildinfo' -not -path '*/node_modules/*' -delete
rm -rf .turbo packages/*/.turbo apps/*/.turbo packages/*/dist
pnpm build:packages
echo '^ rebuild must be clean'

# 15. Docs, agent instructions, domain doc, READMEs updated
git grep -In 'mongo' -- CLAUDE.md CONTEXT.md README.md '*/README.md' '*/docs/*.mdx' \
  apps/storefront/docs/routing.mdx
echo '^ must be empty'

# 16. The tenant-bridge read-path half is reworked/removed
git grep -In -e 'resolveTenantId' -e 'Mongo round-trip' -e 'Tenant._id' \
  -- packages/cms/src/api/resolve-tenant-id.ts
echo '^ resolve-tenant-id.ts must be reworked/removed with the tenant migration'

# 17. Green with MONGODB_URI explicitly blank — proves no hidden default/stub keeps mongoose resolvable
MONGODB_URI= pnpm build:packages && MONGODB_URI= pnpm typecheck && MONGODB_URI= pnpm test
echo '^ must be green with the var blank'

# 18. Codegen gate passes without a Mongo adapter and without the hardcoded generate-types URI
pnpm cms:gen:check
echo '^ must pass'
```

---

## ZERO-MONGO DEFINITION-OF-DONE checklist

This is the binary acceptance gate. Every box must be checked before "no leftovers" can be claimed.

- [ ] **PROCESS/STATE FIRST.** SIGTERM the live daemon chain (mongo-daemon 10419 → mongod 10422 → killer 10423) via `pnpm dev:reset` **before deleting any script**; remove the running `mongodb-mcp-server` MCP wiring from Claude/IDE settings; `rm -rf .mongo-dev/` and `rm -rf ~/.cache/mongodb-binaries`; strip the live `MONGODB_URI` line (and commented `MONGODB_URI_TEST`) from `.env.local`.
- [ ] **DEPS.** Remove direct `mongoose@9.6.3` (db, test-mongo, root hoist-anchor), `@payloadcms/db-mongodb` (cms dep+peer+dev, admin, test-mongo), `mongodb-memory-server` (test-mongo). `pnpm install`; confirm **both** mongoose majors (9.6.3 direct AND 8.22.1 transitive) + `mongodb`/`bson`/`saslprep`/`mongodb-connection-string-url` vanish from the lockfile. `pnpm install --frozen-lockfile` passes.
- [ ] **WORKSPACE PACKAGE.** Delete the entire `@nordcom/commerce-test-mongo` package (cli/daemon/start, all 4 `.mjs` loaders, seed/* + fixtures/*, configs, README, tsconfig); remove all 4 `workspace:*` referrers + the two `--import …/register*` NODE_OPTIONS strings. `git ls-files packages/test-mongo` empty; `git grep '@nordcom/commerce-test-mongo'` empty.
- [ ] **DATA LAYER.** Re-home `@nordcom/commerce-db` onto Convex behind the **same** export surface (services Shop/User/Session/Identity/Review/FeatureFlag — signatures + `NotFoundError`-on-missing-single contract preserved). Delete `db.ts` `mongoose.connect`, `@types/declaration.d.ts`, all `models/*`; **keep** `lib/{feature-flag,theme,theme-catalog}.ts` verbatim; **preserve** credential masking in `docToOnlineShop`.
- [ ] **PAYLOAD/CMS SEAM.** Remove `db: mongooseAdapter` (`config/index.ts:221`) + the `mongoUrl` option, `get-payload-instance.ts:27` `?? ''`, `build-test-config.ts` adapter, `generate-types-config.ts` hardcoded `generate-types-only` URI; rework the ObjectId `'text'` idType assumption (`filterAvailableLocales`/`getTenantFromCookie`). **Under Option B these are deletions with Payload, not adapter swaps.**
- [ ] **3-SHOP-REP GLUE (BOTH halves).** Replace the WRITE-path post-save-hook (`shop-sync`) **and** the READ-path `resolve-tenant-id.ts` (`Shop._id → Tenant._id` bridge — the file no audit listed) with a Convex equivalent or a unified `shops` table; rework `payload.config.ts` `attachShopSync(Shop.model)` + the `MONGODB_URI` gate; rework `auth.adapter.ts` Mongoose-isms (`.toObject()`/`.save()`/`identities.push`).
- [ ] **OBJECTID-SHAPE ASSUMPTIONS** audited end-to-end against opaque Convex string ids: `doc-to-shape` `_id→id`, `config` `filterAvailableLocales`, e2e `String(_id)`, and `_normalize-payload.ts` `{ id: '<ObjectId>' }` heuristic.
- [ ] **LIFECYCLE/TOOLING.** Delete `scripts/{predev-mongo,postdev-mongo,mongo-daemon,clean-mongo,dev-reset}.ts`; remove the 13 root `package.json` hooks/scripts (predev/postdev + 4 `postdev:*` delegates, dev:mongo, dev:reset, prebuild/postbuild, pretest/posttest, clean:mongo) **atomically**; **KEEP the portless-proxy half of `predev`**; remove the `pnpm-workspace.yaml` allowBuilds entry.
- [ ] **TEST HARNESS.** Rewrite the vitest.setup mongoose mocks + `MONGODB_URI` stubs (db, cms, admin; test-mongo deleted) — these `importActual` REAL mongoose and keep it resolvable; rewrite `storefront/vitest.setup.ts` `Shop.findByDomain` mock + `auth.adapter.test.ts` (direct mongoose import); migrate both `e2e/global-setup.ts` (raw `createConnection` seeding + `E2E_TENANT_ID` export) to Convex seed mutations + queries; drop `e2e/fixtures/seed-{shop,cms}.ts` mongo wrappers.
- [ ] **CI.** Remove `MONGOMS_VERSION` + `MONGOMS_DOWNLOAD_DIR` env and all `mongo-binary-cache-hit`/`save-mongo-binary` wiring from `ci.yml` **AND both shared composite actions** (`bootstrap` + `bootstrap-save`) — they're used by deploy/release/docs too.
- [ ] **ENV.** Replace `MONGODB_URI` with Convex vars (`CONVEX_URL` / `NEXT_PUBLIC_CONVEX_URL` / `CONVEX_DEPLOY_KEY`) in all three `.env.example`; `.gitignore`: drop `.mongo-dev`, add the Convex local-state dir if self-hosting.
- [ ] **BUILD ARTIFACTS.** Delete every on-disk `*.tsbuildinfo`, `rm -rf .turbo packages/*/.turbo apps/*/.turbo packages/*/dist`, then `pnpm build:packages` so `packages/db/dist` + `packages/cms/dist` (which the apps import) no longer contain compiled mongoose. Verify dist `.js` has zero `mongoose`.
- [ ] **DOCS & DOMAIN KNOWLEDGE.** Update `CLAUDE.md` (lines 16, 38), `CONTEXT.md` (lines 77, 273, 278), root `README.md`, the 5 package READMEs, and the hand-written doc sources (`packages/db/docs/*.mdx`, `packages/cms/docs/*.mdx`, `apps/storefront/docs/routing.mdx`); regenerate `apps/docs/content/**` + `apps/docs/api/**` via `pnpm gen`; confirm no test-mongo/db-mongoose pages remain.
- [ ] **CHANGESET.** Confirmed **NO changeset required** (all touched packages match `@nordcom/*` ignore glob; none are `cart-*`). Do not add one; do not edit changeset config when deleting test-mongo.
- [ ] **FINAL PROOF GATES (all green):** verification commands #1–#18 above pass; `git grep -IE 'mongo|mongoose|MONGODB_URI|MONGOMS|ObjectId'` returns nothing outside `.specs/` history + generated docs; `pnpm why` finds none of the mongo family; `MONGODB_URI= pnpm build:packages && MONGODB_URI= pnpm typecheck && MONGODB_URI= pnpm test` pass with the var blank; `pnpm cms:gen:check` passes with no Mongo adapter; no `mongod`/`mongo-daemon`/`mongodb-mcp-server` process running; `.mongo-dev/` and `~/.cache/mongodb-binaries` absent.
