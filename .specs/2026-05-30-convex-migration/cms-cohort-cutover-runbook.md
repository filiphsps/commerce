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

---

# CUTOVER-05 — the rich-text cohort (articles + productMetadata + collectionMetadata)

Same coordinated pattern as §1–§4 above, applied to the rich-text-bearing cohort. The branch
carrying this section IS the flip for the cohort: deploying it makes the storefront serve
`article`/`articles`/`productMetadata`/`collectionMetadata` from Convex by default and locks the
cohort's Payload write surface shut. After this flip only `footer` + `businessData` (and the
reviews/feature-flags/media cohort) remain on Payload-on-Mongo until CUTOVER-06.

## 5.1 What the repo state already is (post-flip; cite, don't re-derive)

- **Reads.** The four getters are in `DEFAULT_FLIPPED_GETTERS`
  (`apps/storefront/src/api/_cms-shadow.ts`). Proven by `_cms-shadow.test.ts` (cohort default +
  precedence + retired shadow), `article.test.ts` / `cms-blog.test.ts` / `metadata.test.ts`
  (Convex-served defaults, identity passthrough, null-on-missing overlays, windowed-envelope
  rebuild for the articles listing, emergency-shadow legs), and the Convex side's
  `packages/convex/convex/cms/read.test.ts` (shredded `cms_i18n` body reassembly per locale,
  exact-tag filtering, handle-keyed overlay reads with null-on-missing). The metadata getters
  resolve by SHOPIFY HANDLE on both legs — the natural key the SFREAD-01 goldens pin — via
  `cms/read:productMetadataByHandle`/`collectionMetadataByHandle` (`liveDocByKey` on
  `shopifyHandle`), mirroring the editor's `documentTargetFor` keyField addressing.
- **Rich text.** Post-flip article bodies and metadata `descriptionOverride`s serve as NATIVE
  ProseMirror JSON (no Lexical leg, no codec). Render parity is pinned by
  `apps/storefront/src/blocks/rich-text-renderer.test.tsx`: the golden-parity suite (every Lexical
  fixture through the CMSRICH-04 codec renders the pre-rewrite DOM) plus the cohort-specific case
  ("NATIVE ProseMirror article body … same DOM as its codec-converted Lexical twin"). The blog
  article route renders the body through the `rich-text` block (`Blocks` → `RichTextBlock` →
  `RichText`).
- **Writes.** `articles`, `productMetadata`, `collectionMetadata` are `convexCutoverLocked` +
  `admin.hidden`; Payload still boots with them registered for the final cohort. Identity-pinned
  by the `multi-tenant-isolation.test.ts` "Convex-cutover collection (CUTOVER-04/05)" block.
- **Admin.** The content-overview cards and the article inspector read the Convex authority
  (`editorConvexBridge.list`/`getDocument`); metadata rows route by `data.shopifyHandle`.
- **Publish → bridge.** `packages/convex/convex/cms/on_publish_feed.test.ts` pins the cohort:
  slug-leaf busting for `articles`, document-leaf busting for the handle-keyed metadata
  collections, all seven publishable collections in the shared taxonomy; durable single delivery
  via `revalidate/onPublish.test.ts`.
- **Seeds.** The canonical Convex seed (`seedCmsMutation` + `seedCanonicalLive`) lands the cohort
  as live published `cmsDocuments` rows on their natural keys (slug / shopifyHandle) with
  ProseMirror bodies, alongside the inert legacy mirror rows.

## 5.2 Operator steps BEFORE deploying this branch (in order)

1. **Preconditions green:** the CUTOVER-04 deploy is live and §4's smoke held; G-RICH green on
   the repo corpus.
2. **Freeze cohort authoring:** no articles/productMetadata/collectionMetadata writes during the
   window (steps 3–6).
3. **Final cohort export:** `mongoexport` the `articles`, `productMetadata`, and
   `collectionMetadata` collections (plus their `_versions` companions) from prod.
4. **ETL the cohort to Convex:** run the PIPELINE transform/shred/versions import for the three
   collections into the production deployment (`cmsDocuments`/`cmsVersions`/`cms_i18n`).
5. **Rerun G-RICH on the prod dump.** This is THE rich-text cohort — every article body and
   metadata override crosses the Lexical→ProseMirror codec here. Abort on ANY fidelity mismatch;
   also run the dual-path checksum reconcile for the three collections.
6. **Shadow-bake check:** with the PRE-flip build still serving, `CMS_READ_SHADOW=1` over the
   soak window must show a clean `cmsReadDivergence` ledger for
   `article`/`articles`/`productMetadata`/`collectionMetadata`. Zero divergence gates the deploy.
7. **Deploy this branch.** The deploy IS the flip for the cohort.
8. **Post-deploy smoke:** a blog article page renders its CMS body below the Shopify body
   (ProseMirror DOM, not fallback); a product page with a known overlay handle renders the
   description override; a collection page overlay resolves by handle; the ledger shows no
   `flip-serve failed` errors for the cohort; a REST write against `/api/articles`,
   `/api/productMetadata`, or `/api/collectionMetadata` (any verb) is refused.
9. **Unfreeze authoring** (native editor only). Emergency-shadow lever per getter:
   `CMS_READ_FLIP=-article,-articles,-productMetadata,-collectionMetadata` (degraded read mode,
   same caveats as §3).

---

# CUTOVER-06 — the final cohort (footer + businessData) and the END of the Payload write surface

The finisher. The branch carrying this section flips the LAST two storefront getters (`footer`,
`businessData`) to Convex-native and locks EVERY remaining registered Payload collection's write
surface — after this deploy no collection anywhere accepts a Payload write, which is the
precondition TEARDOWN-02 (delete the Payload application surface) was waiting on.

## 6.1 What the repo state already is (post-flip; cite, don't re-derive)

- **Reads.** `footer` and `businessData` join `DEFAULT_FLIPPED_GETTERS`
  (`apps/storefront/src/api/_cms-shadow.ts`) — the set now covers the COMPLETE 9-surface dual-read
  inventory, so no getter is Mongo-authoritative. Proven by `_cms-shadow.test.ts` (complete-surface
  default + precedence + retired shadow), `footer.test.ts` / `store.test.ts` / `info-bar.test.ts`
  (Convex-served defaults via `cms/read:singleton`, identity passthrough, null-on-missing,
  emergency-shadow legs), and `packages/convex/convex/cms/read.test.ts` (singleton contract frame,
  CMSGATE-01 deep locale collapse for the footer's nested section titles, null for unseeded
  singletons). The full SFREAD-01 golden suite
  (`packages/cms/src/api/cms-read-contract.golden.test.ts`) stays untouched and green — getter
  signatures and contract shapes did not move.
- **Writes.** EVERY registered collection now carries `convexCutoverLocked` on
  `create`/`update`/`delete` plus `admin.hidden`: the 04/05 cohorts, this cohort's
  `footer`/`businessData`, and the table-backed `reviews`/`feature-flags`/`media` plus the
  platform `shops`/`users` mirrors. Pinned exhaustively by
  `packages/cms/src/access/multi-tenant-isolation.test.ts`, whose coverage assertion fails if a
  new collection ever registers without the lock.
- **Where the "special" collections actually live** (the CMSDATA-07 reconciliation):
  - **media** → the Convex `cmsMedia` table. Uploads run the CMSGATE-02 native pipeline
    (`cms/media:generateUploadUrl` → byte sink → `finalizeUpload` mime-verifies and plants the
    4-size derivative plan → the Node-side sharp pass fulfills it via
    `cms/media_derivatives:saveDerivatives`). The four frozen sizes are pinned by
    `packages/cms/src/media/derive.test.ts` ("produces all four frozen sizes at their exact output
    dimensions") and `packages/convex/convex/cms/media_derivatives.test.ts` ("finalizing an image
    plants all four pending plan rows…", "fulfills the plan: four ready rows…"). The admin media
    library (`settings/media/`) now reads `cms/media:list`/`byId` through the bridge instead of the
    `cmsDocuments` read that rendered it empty; the detail page is read-only (media is immutable
    post-upload on the native pipeline — re-author by uploading; a `cmsMedia` alt/caption mutation
    is future Convex-side work).
  - **reviews** → the core Convex `reviews` table behind the `db/reviews` seam. The admin reviews
    page lists real rows via `Review.findByShop`; authoring stays the design-spec'd rework (the
    stored shape is still skeletal — shop ref + timestamps — so there is nothing to author yet).
  - **feature-flags** → the `featureFlags` + `shopFeatureFlags` tables behind `db/feature_flags`.
    No in-app authoring surface exists (the Payload-era one was REST-only); authoring is operator
    tooling (Convex dashboard / seeds) until a dedicated admin surface lands. The
    `featureFlagsEditor` manifest + generated actions are dead scaffolding (TEARDOWN-02).
  - **users** → user management belongs to the auth adapter surface (NextAuth + the Convex
    `users`/`shopCollaborators` tables), not the CMS. The settings/users pages author through the
    native editor bridge; the Payload `users` mirror is read-only (principal resolution) until
    TEARDOWN-02.
- **Admin reads.** The CUTOVER-05 leftovers are closed: the product/collection-metadata LIST pages
  read the Convex authority through `editorConvexBridge.list` (the inert snapshot would miss every
  natively-authored overlay).
- **Seeds.** The canonical Convex seed (`seedCmsMutation` + `seedCanonicalLive`) lands `footer` +
  `businessData` as live published `cmsDocuments` rows alongside header — the complete
  live-document corpus for the whole flipped getter surface.

## 6.2 Payload scaffolding that REMAINS (the TEARDOWN-02 accounting)

All of it is boot-and-read only; none of it can write:

- `apps/admin/src/payload.config.ts` + `buildPayloadConfig` (Payload boots with all collections
  registered-but-locked; mongooseAdapter still connects).
- The `(payload)/api/[...slug]` + graphql REST routes (mounted; every write predicate refuses).
- `apps/admin/src/lib/payload-ctx.ts` + `nextauth-strategy.ts` (session→principal + tenancy reads
  over the `users`/`shops` mirrors, `overrideAccess: true` reads).
- `apps/admin/e2e/global-setup.ts`'s `seedPayloadPrincipal` (raw Mongo-driver write below Payload's
  access surface).
- The storefront getters' Mongo arms (`packages/cms/src/api/get-*`) — the emergency-shadow leg
  behind `-getter` negation.
- The `@nordcom/commerce-test-mongo` dev/e2e machinery and the Mongo seed corpus (inert snapshot).
- The Payload collection configs themselves (`packages/cms/src/collections/**`) and the
  Payload-era editor manifests' unused corners (`featureFlagsEditor`, `reviewsEditor`).

## 6.3 Operator steps BEFORE deploying this branch (in order)

1. **Preconditions green:** the CUTOVER-05 deploy is live and §5.2's smoke held.
2. **Freeze cohort authoring:** no footer/businessData writes during the window (steps 3–5). The
   reviews/feature-flags/media "collections" need no content freeze — their data already lives on
   the Convex core tables (imported by the services cutover / PIPELINE media import), and their
   Payload write paths were REST-only surfaces nothing in the product drives.
3. **Final cohort export:** `mongoexport` the `footer` + `businessData` collections (plus
   `_versions` companions) from prod.
4. **ETL the cohort to Convex:** the PIPELINE transform/shred/versions import for the two
   singletons into the production deployment. (No rich text in this cohort — G-RICH adds nothing;
   run the dual-path checksum reconcile for the two collections instead.)
5. **Shadow-bake check:** with the PRE-flip build still serving, `CMS_READ_SHADOW=1` over the soak
   window must show a clean `cmsReadDivergence` ledger for `footer`/`businessData`. Zero
   unexplained divergence gates the deploy.
6. **Verify the media corpus:** spot-check that migrated media serve URLs resolve (the PIPELINE-02
   import copied each preserved S3/R2 object into Convex storage) and that a fresh admin upload
   produces the four derivative sizes.
7. **Deploy this branch.** The deploy IS the flip — and the end of Payload authoring everywhere.
8. **Post-deploy smoke:** storefront footer + info bar render real content on the canary tenant; a
   native footer edit publish revalidates the storefront; the ledger shows no `flip-serve failed`
   errors; REST writes against `/api/footer`, `/api/businessData`, `/api/reviews`,
   `/api/feature-flags`, `/api/media`, `/api/shops`, and `/api/users` (any verb) are refused; the
   admin media library lists the tenant's `cmsMedia` rows with thumbnails.
9. **Unfreeze authoring** (native editor only). Emergency-shadow lever:
   `CMS_READ_FLIP=-footer,-businessData` (degraded read mode, same caveats as §3).
10. **Hand off to TEARDOWN-02**: everything in §6.2 is now deletable scaffolding.
