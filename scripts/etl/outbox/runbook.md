# PIPELINE-05 — Freeze-window write capture: transactional outbox + idempotent drainer

Operator runbook for the maintenance-freeze window of the Mongo → Convex cutover. The outbox closes
the export window **without ever having two authoritative databases**: Mongo stays the sole
authority for every write until the flip; the outbox is catch-up replication INTO the frozen
snapshot import, drained at-least-once and idempotently into Convex, which remains a non-serving
shadow until the PIPELINE-04 parity gate is green and the flip happens.

Modules: `./append.ts` (same-transaction capture), `./drainer.ts` (idempotent replay + lag),
`../export.ts` / `../import.ts` (the frozen snapshot the drain folds into),
`../reconcile/checksum.ts` + `packages/convex/convex/reconcile.ts` (the post-drain parity gate).

---

## 1. Topology decision: same-session transactional outbox

Both deployment topologies support multi-document transactions:

- **dev/e2e**: `packages/test-mongo` boots a single-node `MongoMemoryReplSet` (WiredTiger), and its
  own comment records that *"Payload wraps every write in a multi-doc transaction"* — transactions
  are not just available, they are already exercised on every Payload write.
- **production**: MongoDB Atlas replica set — same guarantee.

`@payloadcms/db-mongodb@3.85.0` exposes the per-request `ClientSession` registry as
`payload.db.sessions: Record<number | string, ClientSession>` keyed by `req.transactionID`
(see `dist/index.d.ts:133` of the installed adapter). The outbox append therefore composes into the
**same Mongo transaction** as the write it captures:

- `appendOutboxEntry(db, session, entry)` **requires** the session — there is deliberately no
  session-less overload. The append is structurally inseparable from the wrapped write: both commit
  or abort together (pinned by `append.test.ts` against a real replica set).
- A request running **outside** a transaction (`resolveOutboxSession` returns `null`) must be
  **refused** (fail closed; throw a `@nordcom/commerce-errors` class in the admin hook). A
  sessionless append would not be atomic with the write it claims to capture.

The write-ahead-entry fallback design (entry written before the main write + drainer-side existence
reconciliation) is **not needed** on this topology and is intentionally not implemented — it has a
strictly worse failure window (phantom entries for writes that never landed).

## 2. Which write paths get wrapped at freeze time, and how

During the freeze the **admin Payload app is the only live writer** (storefront and landing are
read-only against Mongo; the revalidate hooks only fan out cache invalidations). Payload routes
every collection write — create, update, autosave draft, restore, delete — through its collection
hook pipeline inside the request's transaction, so a **global `afterChange`/`afterDelete` hook pair
added to every collection** captures the complete freeze write surface. Wiring (added to the
Payload config behind a `CONVEX_FREEZE_OUTBOX=1` env flag at freeze start, removed after the flip):

```ts
import {
    captureOutboxDelete,
    captureOutboxUpsert,
    resolveOutboxSession,
} from '../../scripts/etl/outbox/append';

// afterChange — fires for create/update/autosave/restore on every collection:
async ({ req, doc, collection }) => {
    const adapter = req.payload.db as unknown as {
        connection: { db: OutboxDb<ClientSession> };
        sessions: Record<string | number, ClientSession>;
    };
    const session = resolveOutboxSession(adapter, req.transactionID);
    if (!session) throw new OutboxCaptureFailedError(); // fail closed: never write uncaptured
    const db = adapter.connection.db;
    const ts = Date.now();
    // Read-back IN the same session (read-your-own-write): the snapshot is the exact post-write
    // Mongo state, byte-equivalent to a later mongoexport — never the API-shaped hook `doc`.
    const captured = await captureOutboxUpsert(db, session, collection.slug, { _id: doc.id }, ts);
    if (!captured) throw new OutboxCaptureFailedError();
    // Versioned collections: Payload wrote/updated the version row in the SAME transaction; capture
    // the latest one for the parent (covers the 2s-autosave moving target — same version `_id`
    // re-captured with newer content folds append-once on drain).
    if (collection.versions) {
        await captureOutboxUpsert(
            db, session, `_${collection.slug}_versions`,
            { parent: doc.id }, ts, { updatedAt: -1 },
        );
    }
    return doc;
};

// afterDelete — fires with the deleted id; the row is already gone inside the transaction:
async ({ req, id, collection }) => {
    const session = resolveOutboxSession(adapter, req.transactionID);
    if (!session) throw new OutboxCaptureFailedError();
    await captureOutboxDelete(adapter.connection.db, session, collection.slug, String(id), Date.now());
};
```

`OutboxCaptureFailedError` is added to `@nordcom/commerce-errors` (plus its `*ErrorKind` and
`getErrorFromCode` case) when the hook lands in the admin — the repo convention for a new failure
mode; no existing class fits "refused a write because its capture could not be made atomic".

A hook throw aborts Payload's transaction — the write itself is rolled back, which is the desired
fail-closed behavior: during the freeze, **no write may land uncaptured**.

### Failure windows (precise inventory)

1. **Same-row same-millisecond races**: drain order is `(ts, outbox _id)`; two captures of the same
   row in the same ms from different sessions could order by `_id` against commit order. Entries
   carry FULL post-write state, so the exposure is bounded to last-write-wins picking the wrong one
   of two writes < 1 ms apart to the same row — only reachable if the freeze's single admin writer
   races itself. Accepted; the post-drain checksum parity gate (§5) would catch a wrong pick.
2. **Out-of-band writers**: anything writing Mongo without the Payload hook pipeline (manual
   `mongosh`, migration scripts) is invisible to the outbox. **Forbidden during the freeze** — the
   freeze checklist (§6) shuts down every non-admin writer; the parity gate is the backstop.
3. **Capture-coverage of version pruning**: Payload's `maxPerDoc` version pruning deletes old
   version rows without an `afterDelete` per row. The drainer folds versions append-once from the
   frozen snapshot + outbox; a pruned-then-missing old version row means Convex may retain history
   Mongo pruned — acceptable (history superset, never loss). The latest-pointer is recomputed from
   the folded corpus, so correctness of `latestVersionId` is unaffected.

## 3. Draining: at-least-once, idempotent, replayable

```
tsx scripts/etl/outbox/drainer.ts             # dry: fold + stage + lag report (no Convex writes, cursor untouched)
tsx scripts/etl/outbox/drainer.ts --execute   # mongoexport outbox → fold → per-table `convex import --replace` → cursor
```

Every drain folds the **entire** outbox (in capture order) over the **immutable** frozen snapshot
under the staging dir (`$ETL_OUT_DIR`, default `./.etl`):

- the upsert key is the source row's `_id` hex, remapped through the **same** deterministic
  PIPELINE-01 id derivation (`../transform/id-remap.ts`) the initial import used — a re-drained row
  lands on the same surrogate `payloadId`, never a duplicate;
- version rows fold **append-once** by the version row's own derived identity
  (`../transform/versions.ts`); an autosave re-capture of the same version `_id` replaces, never
  duplicates;
- staging is **full-table** and applied with `convex import --table --replace` (the exact
  PIPELINE-01 import path) — replaying the whole outbox, any suffix, or re-running after a
  mid-batch kill converges to identical Convex state (pinned by `drainer.test.ts`). Full-table is
  also a correctness requirement: `cmsDocuments` holds every collection slug, so a partial
  `--replace` would wipe the rest.
- the cursor (`<staging>/outbox-cursor.json`) is at-least-once **bookkeeping only**: it advances
  after a fully successful `--execute` and is never a precondition — a corrupt/lost cursor only
  widens the replay, which is idempotent.

The drainer hard-fails (exit 1, flip NO-GO) on: malformed outbox rows (a captured write may be
lost), rich-text divergences in freeze writes, or duplicate surrogate ids.

## 4. Drain lag: the <=60 s bound and how to measure it live

The drainer prints a lag report on every run (dry runs included):

```
[etl/outbox] lag: N undrained entr(ies), oldest=<ts> latest=<ts> lagMs=<now - oldest>
```

`latest` is the **lag cursor** — the capture ts of the newest entry not yet covered by a successful
apply; `lagMs` measures from the **oldest** undrained entry, which is the conservative bound.

**Bound**: at the final quiesce the drain must reach `lagMs = 0` within **60 seconds** of the last
admin write. Measure live during the freeze with a watch loop (dry mode never touches Convex or the
cursor, so it is safe to run continuously):

```sh
while sleep 10; do tsx scripts/etl/outbox/drainer.ts | grep '\[etl/outbox\] lag:'; done
```

**Procedure for the bound**: run `--execute` drains in a loop during the freeze. Each `--execute`
re-exports the outbox first, so residual lag is exactly the writes captured **after** that export —
the next iteration's work. At cutover: stop the admin writer (end of freeze), run one final
`--execute`, then a dry run must report `0 undrained / lagMs=0`. If the final drain cannot complete
within the bound, the freeze window stays open — Mongo remains authoritative, nothing is half
flipped (that is the whole point of the design).

## 5. Post-drain reconciliation gate (PIPELINE-04 wiring) — flip precondition

Every drain (dry and `--execute`) recomputes the expected-side checksums of the **folded** corpus
through the real PIPELINE-04 builder (`../reconcile/checksum.ts`) and writes them to:

```
<staging>/convex/reconcile-expected.json
```

`drainer.test.ts` pins that the folded corpus checksums **identically** to a from-scratch export of
the post-write Mongo state — so this file is the legitimate expected side for the final state, not
just for the original snapshot.

**A drained state MUST re-verify parity before the flip.** After the final zero-lag drain:

1. Run `packages/convex/convex/reconcile.ts`'s `run` action against the deployment with the
   contents of `reconcile-expected.json` as `expected` (the CUTOVER-01 dress-rehearsal invocation;
   `packages/test-convex/src/reconcile-parity.test.ts` is the executable reference for the call
   shape).
2. The flip is **NO-GO until the divergence ledger is green** (zero mismatched collections). Any
   divergence reopens the freeze: fix, re-drain, re-verify.
3. Only then flip reads to Convex (`CMS_READ_FLIP`) and lift the freeze. Mongo was authoritative up
   to this instant; Convex becomes authoritative after it; at no point did both accept writes.

## 6. Freeze checklist (condensed)

1. Announce freeze; stop every non-admin writer (cron jobs, scripts, shells). Admin stays up.
2. Set `CONVEX_FREEZE_OUTBOX=1`; deploy the admin with the §2 hook pair. Verify with a probe write
   that `_convex_outbox` receives the entry atomically.
3. Run the PIPELINE-01 export (`../export.ts` + the CMS collection exports) → the frozen snapshot.
   The snapshot files are **immutable** from this point.
4. Initial import (`../import.ts --execute`) + PIPELINE-04 parity on the snapshot.
5. Drain loop: `drainer.ts --execute` until the lag report holds steady near zero (§4).
6. End of freeze: stop admin writes, final `--execute` drain, confirm `lagMs=0`.
7. §5 parity gate on `reconcile-expected.json`. Green → flip. Not green → freeze stays, diagnose.
8. After the flip: remove the hook pair (`CONVEX_FREEZE_OUTBOX` off), archive `_convex_outbox` and
   the staging dir as the cutover audit trail.
