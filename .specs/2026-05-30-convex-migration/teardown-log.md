# TEARDOWN-00/01 — local Mongo process kill + machine-state scrub (executed 2026-06-11)

Process/state-first step of the Mongo teardown wave, per
`mongo-teardown-inventory.md` §C ("Runtime/state traps") and the PROCESS/STATE-FIRST
checklist item. Executed on the dev machine (`darwin`, repo at
`/Users/filiphsandstrom/commerce`) BEFORE any script or package deletion, while the
lifecycle scripts (`scripts/dev-reset.ts`, `scripts/clean-mongo.ts`) still exist.

**No repository code changed in this step.** The only repo-tracked artifact is this log.
Everything else touched is gitignored runtime state (`.mongo-dev/`, `.env.local`) or
machine state outside the repo (`~/.cache/mongodb-binaries`).

---

## 1. Process state — BEFORE

The inventory recorded a live daemon chain (mongo-daemon 10419 → mongod 10422 →
mongo_killer 10423) plus 4 `mongodb-mcp-server` processes at inventory time. None
survived to this session — all pgrep probes came back empty:

```
$ pgrep -fl mongod          → (no output) EXIT=1
$ pgrep -fl mongo-daemon    → (no output) EXIT=1
$ pgrep -fl mongodb-mcp     → (no output) EXIT=1
$ pgrep -fl "mongo_killer\|mongo-killer" → (no output) EXIT=1
```

Disk state confirmed the daemon was down but its state survived: `.mongo-dev/` held a
stale `.dev.pid` (84525) and `.seeded` marker but no daemon `.pid` file.

## 2. Polite shutdown — `dev:reset` (pidfile-driven SIGTERM path)

Run directly via the repo's `tsx` (the `pnpm dev:reset` wrapper aborted on pnpm's
`verify-deps-before-run` auto-install, which fails on the pre-existing unrelated
`react-payment-brand-icons#build` breakage — the reset script itself never ran there):

```
$ node node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/cli.mjs scripts/dev-reset.ts
[dev-reset] dev session pid 84525 is not running — removing stale marker
[dev-reset] no mongo daemon pid file at /Users/filiphsandstrom/commerce/.mongo-dev/.pid
[dev-reset] removed /Users/filiphsandstrom/commerce/.mongo-dev
[dev-reset] done.
EXIT=0
```

This also removed `.mongo-dev/` (123 MB, ~278 entries of WiredTiger data + markers) and
confirmed no live `MONGODB_URI` line was under `.env-managed` control in `.env.local`.

## 3. Final orphan-reaper run — `clean-mongo.ts` (while it still exists)

```
$ node node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/cli.mjs scripts/clean-mongo.ts
[clean-mongo] 0 killed, 0 sockets, 0 dirs
EXIT=0
```

No orphan `mongo-mem-*` mongod processes, `/tmp/mongodb-*.sock` sockets, or tmp data
dirs remained for the reaper to collect.

## 4. Machine-local state scrub

Locations derived from the launcher source: `packages/test-mongo/src/start.ts` defers
binary download to `mongodb-memory-server` (default cache `~/.cache/mongodb-binaries`,
secondary `node_modules/.cache/mongodb-memory-server`); `scripts/mongo-daemon.ts` pins
data/pid/uri under `.mongo-dev/`.

| State | Before | Action | After |
| --- | --- | --- | --- |
| `.mongo-dev/` | 123 MB, ~278 entries | removed by `dev-reset` (§2) | `ls: No such file or directory` |
| `~/.cache/mongodb-binaries/` | 191 MB (`mongod-arm64-darwin-8.0.4`) | `rm -rf` | `ls: No such file or directory` |
| `node_modules/.cache/mongodb-memory-server/` | present (lockfile cache) | `rm -rf` | `ls: No such file or directory` |
| `/tmp/mongodb-*.sock`, `/tmp/mongo-mem-*` | none | n/a (clean-mongo verified) | none |
| `MONGOMS_*` shell env / `~/.zshrc`·`~/.zshenv`·`~/.zprofile` | none set | n/a | none |
| `.env.local` (gitignored) | commented `# MONGODB_URI_TEST=…` line | stripped per inventory checklist | 0 `MONGO` matches |

Post-scrub process re-check (all empty, EXIT=1): `pgrep -fl mongod`,
`pgrep -fl "mongo-daemon\|mongodb-mcp"`.

`mongodb-mcp-server` MCP wiring (inventory item 18, Claude/IDE settings): no processes
running this session; removing the settings wiring is operator-owned and outside this
task's repo scope.

## 5. Production cold-backup pointer (operator-owned)

The production equivalent of this step is the final pre-flip Mongo cold backup,
runbook'd in `one-way-gate.md` §5 (dump → immutable S3 ship with checksum round-trip →
mandatory scratch-restore verification via `scripts/etl/reverse/run.ts --compare` →
retention until TEARDOWN completes AND the Phase C one-way window is accepted closed;
12 months recommended). That checklist row remains operator-owned and is NOT discharged
by this log — this log only records that the local/dev-machine analog (process kill +
state scrub) ran. The reverse-ETL tooling the §5 verification depends on
(`scripts/etl/**`) survives the teardown wave by design.

## 6. Repo state

`git status --porcelain` after this step: only this new log plus the pre-existing
untracked allowances (`.specs/2026-05-30-convex-migration/*.workflow.js` and
`apps/docs/content/packages/{convex,test-convex}/`). No tracked file was modified —
no source file, manifest, lockfile, or CI file was created, edited, or deleted by
TEARDOWN-00/01.
