# G2 — Rollback net: reverse-ETL, the one-way gate, and the final pre-flip backup (CUTOVER-02)

G2 is the gate that must be green BEFORE anything irreversible starts: it proves there is a working
way back for everything that *can* come back (the core collections, via the reverse-ETL), states in
writing exactly what *cannot* come back (the one-way clauses), and takes + restore-verifies the
final pre-flip Mongo cold backup. Per the execution plan, **no flip (CUTOVER-03) and no CMS cutover
(CUTOVER-04/05/06) starts until every section of this document is green and §4 is signed.**

---

## 1. The rollback tool: `scripts/etl/reverse/`

The reverse-ETL (Convex→Mongo) for the core storefront-service collections — the inverse of the
PIPELINE-01 forward transform. Committed, tested, and wired into the scripts vitest suite.

| Module | Role |
| --- | --- |
| `scripts/etl/reverse/invert.ts` | Pure inversion core: Convex snapshot → Mongo-shaped restore documents. Re-embeds the shop family (`shopCredentials` secrets → `commerceProvider.authentication`, `shopFeatureFlags` → the embedded ref array, `shopCollaborators` → `collaborators`), restores `_id` from `legacyId` where preserved, mints deterministic replacement ObjectIds where not, and reports every non-invertible row as a divergence. |
| `scripts/etl/reverse/round-trip.ts` | The parity gate: `original → forward transform → reverse → checksum` compared against the original through the **PIPELINE-04 checksum module** (`scripts/etl/reconcile/checksum.ts` on `packages/convex/convex/lib/checksum.ts`) — the same canonical projection production parity was proven in. |
| `scripts/etl/reverse/run.ts` | Operator CLI: `--verify` (round-trip gate over a mongoexport corpus), `--restore` (Convex snapshot → mongoimport-ready JSONL), `--compare` (two corpora through the same comparator — the backup restore-verification step in §5). Non-zero exit on ANY divergence, mismatch, or an empty corpus. |

### Commands

```sh
# Round-trip parity gate (G2 criterion 1) over a mongoexport corpus dir (default $ETL_OUT_DIR / ./.etl):
pnpm tsx scripts/etl/reverse/run.ts --verify [corpusDir]

# Stage a rollback restore from a Convex snapshot (unzipped `npx convex export` — flat <table>.jsonl
# or <table>/documents.jsonl both accepted); prints the exact mongoimport commands:
pnpm tsx scripts/etl/reverse/run.ts --restore <snapshotDir> [--out <dir>]

# Compare two mongoexport corpora per collection (used for backup restore verification, §5):
pnpm tsx scripts/etl/reverse/run.ts --compare <dirA> <dirB>

# The committed test gate (part of the scripts suite):
pnpm dotenv -c -- vitest run --config scripts/vitest.config.ts etl/reverse
```

### Recorded run (2026-06-11, in-sandbox — canonical corpus at the CUTOVER-01 rehearsal scale)

`--verify` over a 24-tenant corpus (8 flags, 96 reviews, alternate domains, Shopify credentials):

```
Round-trip parity: GREEN (224 document(s) compared)
featureFlags match 8/8 · reviews match 96/96 · shopCredentials match 24/24
shopDomains match 48/48 · shopFeatureFlags match 24/24 · shops match 24/24   exit 0
```

The vitest gate additionally pins: full per-collection parity on the canonical corpus (never a
sample — every document is hashed), determinism across runs, an injected bug (mutated field /
dropped credential secret) localized to exactly its collection with a non-green verdict, and the
empty-corpus refusal. Suite: 26 passed (`etl/reverse/{invert,round-trip,run}.test.ts`).

### Restore semantics (read before running a rollback)

- **Wholesale replacement, never a merge.** Post-flip, Convex is the single authority; the staged
  `mongoimport` commands use `--drop` per collection. Upserting would DUPLICATE rows whose original
  ObjectIds were not preserved (reviews, auth family — see below).
- **Restore order:** `shops`, `featureFlags`, `reviews`, then `users`, `sessions`, `identities`
  (the order `run.ts --restore` emits).
- After the restore, point the rolled-back deployment's `MONGODB_URI` at the restored database and
  deploy the pre-cutover branch state (see §3 for which revert applies per phase).

---

## 2. Exactly what is reversible — and with what fidelity

Parity below means parity in the canonical PIPELINE-04 projection: volatile `_id`/`_creationTime`
stripped, id references mapped to stable identities, timestamps as the source-preserved epoch-ms.
That is the projection the forward cutover was reconciled in, so forward and reverse are proven in
the same currency.

| Collection | Reversible? | Identity fidelity | Notes |
| --- | --- | --- | --- |
| `shops` (incl. re-embedded credentials, collaborators, feature-flag refs) | **Yes** | **Exact** — `_id` restored from `legacyId` | `commerceProvider.authentication.token` and `customers.clientSecret` fold back from `shopCredentials`. `shopDomains` is derived state; it is consistency-checked, not restored. Fields the forward transform dropped (anything outside the validator) only exist in the cold backup. |
| `featureFlags` | **Yes** | **Exact** — `_id` from `legacyId` | `targeting` comes back in its forward-normalized form (`[]` when the source omitted it). |
| `reviews` | **Yes** | **Minted** — original ObjectIds were not preserved (`reviews` carries no `legacyId` by validator design) | Replacement `_id`s are deterministic (stable across reverse re-runs). The `shop` reference is exact. Nothing external keys on review ObjectIds. |
| `users` | **Yes** | **Minted** — auth tables carry no `legacyId` | Email/name/avatar/groups/`emailVerified`/embedded identities restore exactly; migrated embedded-identity subdocument ids restore exactly (the Convex `id` IS the Mongo subdocument id); post-flip native links get minted subdocument ids. |
| `sessions` | **Yes** | **Minted** | `user` references remap consistently to the minted user ids. Operationally disposable — a forced re-login on rollback is acceptable. |
| `identities` | **Yes** | **Minted** | `(provider, identity)` natural key restores exactly, so OAuth re-link is lossless. |

**Referential consistency is preserved within the restored set** (collaborator→user,
session→user, review→shop, shop→flag) even where ObjectIds are minted. What is lost with minted
ids is *continuity with the pre-flip database* for those rows — which is why the restore is a
wholesale `--drop` replacement and never layered over old rows.

---

## 3. The one-way clauses — what cannot come back, and why

These asymmetries are structural, not implementation gaps left for later. Signing §4 acknowledges
them.

1. **CMS rich text authored post-flip (ProseMirror) cannot round-trip to Lexical.** The fidelity
   program (CMSRICH-03/04, G-RICH) built and proved exactly ONE codec direction:
   Lexical→ProseMirror, for the forward migration. **No ProseMirror→Lexical codec exists**, none is
   planned, and building one is explicitly out of scope — that asymmetry is the point of this gate.
   Any CMS document created or edited after admin authoring flips to Convex (CUTOVER-04 onward)
   exists only as ProseMirror. Rolling the CMS back to Payload-on-Mongo means restoring the §5 cold
   backup: **every post-flip CMS edit is lost**, by declared policy.
2. **Media derivative state.** Post-flip uploads live as Convex storage ids with
   pipeline-generated derivatives; the read path serves a dual source (Convex `storageId` +
   migrated S3 keys). There is no mapping from Convex storage objects back to Payload `media`
   documents and S3 key layout — post-flip uploads do not exist in a restored Mongo world.
3. **Version-history granularity.** Convex `cmsVersions` pins immutable published snapshots plus
   the working draft; Payload's `_versions`/autosave trail has different granularity and identity.
   Post-flip version history cannot be replayed into Payload's `_versions` collections; restored
   history is whatever the cold backup holds.

### Rollback story per phase

| Phase | Window | Rollback | Loss |
| --- | --- | --- | --- |
| **A — before the CUTOVER-03 flip** | Cutover branch not yet deployed / freeze not started | Do not deploy (or revert the branch). Mongo was never touched. | **None.** |
| **B — after CUTOVER-03, before CMS authoring flips (CUTOVER-04)** | Convex is storefront-services authority; CMS still authored via Payload-on-Mongo | Branch revert + reverse-ETL restore of the core collections (§1) over the §5 backup base. | ObjectId continuity for reviews/users/sessions/identities (minted ids, internally consistent); active sessions (re-login). |
| **C — after CMS authoring begins on Convex (CUTOVER-04+)** | CMS content is being authored as ProseMirror | Core collections as Phase B. CMS = restore the §5 cold backup. | Phase B losses **plus every post-flip CMS edit, upload, and version row** (the one-way clauses). |

The deeper into the CMS cohorts (04 → 05 → 06) the flip is, the larger clause C's blast radius —
which is why §4 requires the bake + soak windows to elapse BEFORE each successive irreversible
step, not just before the first one.

---

## 4. Signed one-way-gate checklist (the G2 sign-off)

Budgets and soak definitions are the committed ones in `cutover-budgets.md` (§2 and §4 there);
this checklist does not redefine them, it binds them to the irreversibility decision. Work top to
bottom; any red row is a full stop.

- [ ] **C1 — Reverse-ETL round-trip parity green (this repo).**
      `vitest run --config scripts/vitest.config.ts etl/reverse` → all passed, AND
      `tsx scripts/etl/reverse/run.ts --verify` over the **production freeze-window export**
      (the same `$ETL_OUT_DIR` corpus CUTOVER-03 imports from) → `GREEN`, exit 0, FULL
      per-collection counts printed and recorded here: ____________________
- [ ] **C2 — Final pre-flip cold backup taken and restore-verified** per §5; archive URL +
      `--compare` output recorded here: ____________________
- [ ] **C3 — Budgets green at flip time.** `cutover-budgets.md` §2 B1–B3 standing PASS re-confirmed;
      operator rows R2–R5 there completed.
- [ ] **C4 — Canary soak ≥ 24 h (B4)** elapsed on Convex authority with zero unexplained
      divergence ledger rows, BEFORE the first CMS cutover (CUTOVER-04).
- [ ] **C5 — Full-cohort soak ≥ 72 h (B5/B6)** elapsed, ≥ 1,000 sampled reads per active tenant,
      zero unexplained divergence, BEFORE CUTOVER-04.
- [ ] **C6 — Bake window: ≥ 7 calendar days on Convex authority** (covering ≥ one weekly traffic
      cycle, strictly containing C4+C5) elapsed between the CUTOVER-03 flip and the first one-way
      CMS step, with no open severity-1/2 incident attributable to the migration.
- [ ] **C7 — One-way clauses acknowledged.** The signer has read §3 and accepts that past
      CUTOVER-04, rollback loses all post-flip CMS edits, uploads, and version history.

| Field | Value |
| --- | --- |
| Operator (name) | _________________ |
| Date | _________________ |
| C1 parity evidence (run id / output ref) | _________________ |
| C2 backup archive + verification ref | _________________ |
| Verdict | GO / NO-GO |
| If NO-GO: blocking row(s) | _________________ |

---

## 5. Final pre-flip Mongo cold backup — operator runbook

Taken INSIDE the CUTOVER-03 maintenance freeze, after writes are frozen and the outbox is drained
(`scripts/etl/outbox/runbook.md`), immediately before the authority flip. This backup is the
last-ever consistent Mongo state and the Phase C rollback base — treat it as permanent.

### 5.1 Dump

```sh
# Inside the freeze (writes stopped, outbox drained). --oplog is unnecessary on a frozen primary
# but harmless on a replica set; --gzip --archive yields a single verifiable artifact.
mongodump --uri="$MONGODB_URI" --gzip --archive=preflip-$(date -u +%Y%m%dT%H%M%SZ).archive

shasum -a 256 preflip-*.archive > preflip.sha256
```

### 5.2 Ship to object storage (immutable)

```sh
aws s3 cp preflip-*.archive  s3://<backup-bucket>/convex-cutover/ --storage-class STANDARD_IA
aws s3 cp preflip.sha256     s3://<backup-bucket>/convex-cutover/
# Re-download and re-verify the checksum from the bucket copy — the upload is not "taken" until
# the round-tripped bytes hash identically:
aws s3 cp s3://<backup-bucket>/convex-cutover/preflip-<stamp>.archive ./verify.archive
shasum -a 256 -c preflip.sha256   # against verify.archive
```

Bucket requirements: versioning ON, object-lock/retention or equivalent delete protection, and
access restricted to the operators executing this runbook.

### 5.3 Restore verification (mandatory — an unverified backup is not a backup)

1. **Scratch instance:** `docker run -d --name preflip-verify -p 27018:27017 mongo:7`
2. **Restore the bucket copy** (never the local original):
   `mongorestore --uri="mongodb://localhost:27018" --gzip --archive=verify.archive --drop`
3. **Checksum the restored data against the freeze export** with the same comparator the cutover
   itself was reconciled with:

   ```sh
   # Export the scratch restore in the pipeline's shape:
   MONGODB_URI="mongodb://localhost:27018/<db>" ETL_OUT_DIR=./.etl-verify \
       pnpm tsx scripts/etl/export.ts

   # Compare against the freeze-window export ($ETL_OUT_DIR) per collection, full set:
   pnpm tsx scripts/etl/reverse/run.ts --compare ./.etl ./.etl-verify
   ```

   Required result: every collection `match`, non-zero document counts, exit 0. Record the output
   in checklist row C2.
4. **Spot-check beyond the pipeline collections** (the backup also carries CMS + auth
   collections the comparator does not cover): `mongosh --port 27018` →
   `db.getCollectionNames()` against the production list, and per-collection
   `db.<coll>.countDocuments()` equal to production counts captured during the freeze. Record both
   lists.
5. Tear down the scratch instance: `docker rm -f preflip-verify`.

### 5.4 Retention

Keep the archive at least until TEARDOWN completes AND the Phase C one-way window is accepted
closed (signed §4 + all CMS cohorts stable). Recommended: 12 months minimum, then review.

---

*Maintained as part of CUTOVER-02. The reverse-ETL suite (`scripts/etl/reverse/*.test.ts`) is the
repo-side guard; rows C1–C7 and §5 are the operator's, executed during the cutover window.*
