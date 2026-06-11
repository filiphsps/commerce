# CUTOVER-04 — CMS gate-collection cohort (header + pages): the read+write flip (operator runbook)

This runbook covers the FIRST CMS content cohort — the gate collections `header` (recursive nav)
and `pages` (block bodies) — and is the PATTERN for CUTOVER-05 (articles + product/collection
metadata) and CUTOVER-06 (footer/businessData + reviews/feature-flags/media). The branch carrying
this runbook IS the flip for the cohort: deploying it makes the storefront serve header/page/pages
from Convex by default and locks the cohort's Payload write surface shut. Everything that must
happen BEFORE that deploy is an operator step below.

## 1. What the repo state already is (post-flip; cite, don't re-derive)

- **Reads.** The storefront getters `header`, `page`, `pages` are Convex-native BY DEFAULT —
  `DEFAULT_FLIPPED_GETTERS` in `apps/storefront/src/api/_cms-shadow.ts`. Proven by
  `apps/storefront/src/api/_cms-shadow.test.ts` (default-flip + precedence + retired-shadow),
  `header.test.ts` / `page.test.ts` / `_draft-read.test.ts` (Convex-served defaults, null-on-missing,
  draft seam, one-bounded-read sitemap budget), and the Convex side's
  `packages/convex/convex/cms/read.test.ts` (SFREAD-01 contract frame, published-snapshot pinning,
  locale collapse). The Mongo-side SFREAD-01 golden suite
  (`packages/cms/src/api/cms-read-contract.golden.test.ts`) is untouched and still green — the
  getter signatures and contract shapes did not move.
- **Writes.** The cohort's Payload write surface is REMOVED: `create`/`update`/`delete` on the
  `pages` and `header` collections are `convexCutoverLocked` (always-false; admins included) and
  the collections carry `admin.hidden`. Payload still BOOTS with the collections registered — the
  not-yet-flipped cohorts and the cohort's read path (emergency-shadow leg, pre-teardown dashboard
  reads) are unaffected. Identity-pinned by
  `packages/cms/src/access/multi-tenant-isolation.test.ts` ("Convex-cutover collection" block).
- **Authoring.** The native editor at `[domain]/content/{header,pages}` is the only authoring
  path (Convex bridge, operator RS256 tokens). The admin content-overview "Pages" card and the
  pages inspector pane read the Convex authority, not the inert Mongo snapshot.
- **Publish → bridge.** Publishing header/pages drives the durable Convex→Next revalidation
  bridge, never Payload `afterChange`: `packages/convex/convex/cms/on_publish_feed.test.ts`
  (slug-leaf busting for `pages`, collection-level publish for the `header` singleton, all seven
  publishable collections pinned) and `packages/convex/convex/revalidate/onPublish.test.ts`
  (single durable delivery, 12-publish coalescing, autosave/draft loops schedule NOTHING).
- **Seeds.** The Convex canonical seed lands the cohort as live `cmsDocuments` rows (the table
  `cms/read.ts` serves) in the pointerless published shape, alongside the legacy mirror-table
  rows; the Mongo seed machinery still seeds the cohort's Payload collections (with
  `overrideAccess: true`, which bypasses the write lock by Payload contract). The Mongo copies are
  INERT for the cohort from this flip on — leave the Mongo seeds in place until TEARDOWN-03
  deletes the test-mongo package.

## 2. Shadow design for flipped cohorts (binding for 05/06)

The divergence shadow RETIRES for a flipped getter; it does not invert. Post-flip the Mongo copy
is a frozen snapshot, so a Mongo-as-shadow comparison would flag a mismatch on the FIRST native
edit and emit steady ledger noise that drowns the real signal from the cohorts still baking
Mongo-authoritative (`article`, `articles`, `footer`, `businessData`, `productMetadata`,
`collectionMetadata` — their `CMS_READ_SHADOW` comparison is unchanged). The ledger stays useful
for the flipped cohort too: a flipped serve that FAILS falls back to the Mongo snapshot and
records a `kind: 'error'` row (`flip-serve failed…`), so a Convex incident is visible without a
comparison loop.

## 3. The env lever now works in BOTH directions

`CMS_READ_FLIP` precedence (most-specific wins): `-getter` → `getter` → `-*`/`-all` → `*`/`all` →
cohort default. Examples:

| Goal | Setting |
| --- | --- |
| Post-flip default (nothing set) | `CMS_READ_FLIP=` — header/page/pages on Convex |
| Emergency-shadow ONE getter | `CMS_READ_FLIP=-header` |
| Emergency-shadow the whole cohort | `CMS_READ_FLIP=-header,-page,-pages` (or `-*`) |
| Early-flip a 05/06 getter for canary | `CMS_READ_FLIP=article` |

**Emergency-shadow is a degraded read mode, not a rollback.** The negated getter serves the
cutover-time Mongo snapshot (stale the moment anyone edits natively — the write lock guarantees
the snapshot cannot be updated) and re-enables the opt-in `CMS_READ_SHADOW` comparison, which will
legitimately report drift against live Convex content. Use it to ride out a Convex read incident;
clear it the moment the incident ends. There is no authoring fallback — the Payload write path is
locked and stays locked.

## 4. Operator steps BEFORE deploying this branch (in order)

1. **Preconditions green:** G1/G3/G4 suites, G-RICH on the repo corpus, the CUTOVER-01 budgets
   go/no-go, and the CUTOVER-02 G2/one-way gate sign-off (see `one-way-gate.md`) — the CMS cohorts
   ride the same irreversibility posture as the services flip.
2. **Freeze cohort authoring** (announce + revoke editor sessions or maintenance-window the admin):
   no header/pages writes during the window. The window only needs to cover steps 3–6.
3. **Final cohort export:** `mongoexport` the `header` + `pages` collections (plus their
   `_versions` companions) from prod.
4. **ETL the cohort to Convex:** run the PIPELINE transform/shred/versions import for the two
   collections into the production deployment (`cmsDocuments`/`cmsVersions`/`cms_i18n`).
5. **Rerun G-RICH on the prod dump** (rich-text fidelity over the real corpus) and the dual-path
   checksum reconcile for the cohort — abort on any mismatch.
6. **Shadow-bake check:** with the PRE-flip build still serving, `CMS_READ_SHADOW=1` over the soak
   window must show a clean `cmsReadDivergence` ledger for `header`/`page`/`pages` (the SFREAD-12
   bake). Zero divergence is the gate to proceed.
7. **Deploy this branch.** The deploy IS the flip: reads default to Convex, the Payload write lock
   is live, the native editor is the only authoring path.
8. **Post-deploy smoke:** storefront chrome renders the real nav (not fallback) on the canary
   tenant; a page route + sitemap `pages.xml` serve; a native header edit publish revalidates the
   storefront; the ledger shows no `flip-serve failed` errors; a REST write attempt against
   `/api/pages` (any verb) is refused.
9. **Unfreeze authoring** (native editor only).

## 5. What CUTOVER-05/06 copy

Per cohort: extend `DEFAULT_FLIPPED_GETTERS`, swap the cohort's collection write access to
`convexCutoverLocked` (+ `admin.hidden`), move any admin reads of the cohort's slugs to the Convex
bridge, extend the canonical Convex seed's `cmsDocuments` block, update both `.env.example` flip
notes, and repeat §4. CUTOVER-06 additionally retires the LAST Payload write path, unblocking
TEARDOWN-02.
