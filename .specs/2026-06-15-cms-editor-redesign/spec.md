# CMS editor redesign + live preview

## Goal
Redesign the admin CMS content editor (pages/articles/metadata) — currently bare Tailwind inputs — into a polished, cohesive surface, and add live preview mirroring the theme editor. Reuse components; extract shared bits. Storefront must carry **zero preview footprint** for normal visitors.

## Decisions (grilled)
- **Preview engine: hybrid.** Instant optimistic plain-text patch + accurate `router.refresh()` reconcile after autosave.
- **Widget reuse: registry override from admin.** Keep `@nordcom/commerce-cms` editor library-agnostic; admin registers nordstar/ui widgets via a package-level client `FieldWidgetsProvider` context that `EditorFields` merges over its built-ins (last-write-wins).
- **Aesthetic: elevate existing admin language** (dark, Montserrat + Geist Mono, magenta primary, nordstar).
- **Zero footprint constraint (user):** all preview code gated behind `draftMode()` server gate (client chunk never shipped to normal visitors); `data-cms-field` hints only emitted when `context.preview` is true.

## Mechanics
- Theme preview = CSS vars via postMessage (client-only, cheap). Content blocks are async RSC (`collection`/`vendors` fetch data) → cannot be re-rendered client-side from postMessage. So:
  - **Accurate channel:** autosave persists draft → admin posts `content-preview` `{refresh:true}` → storefront `PreviewContentBridge` calls `router.refresh()` → RSC re-render reads draft (`draftMode` already serves `doc.data`). Reuses existing draft-read path.
  - **Instant channel:** admin posts `content-preview` `{patches:[[path,text]]}` (debounced) → bridge sets `textContent` on `[data-cms-field=path]`. Plain-text scalars only; rich-text/data blocks reconcile via refresh.
- Refresh trigger: admin `DraftPublishToolbar` dispatches a `window` `CustomEvent` when a save lands (`lastSavedAt` advances); content preview hook listens and posts the refresh ping after persistence (no stale race).

## Files
- `packages/cms/src/editor/preview/messages.ts` (+content message types/guards), `index.ts` (exports)
- `packages/cms/src/editor/form/` — add `FieldWidgetsProvider` context; `editor-fields.tsx` merges overrides
- `apps/admin/src/components/cms/` — `content-preview-bridge.tsx`, `use-content-preview.ts`, polished field widgets (`fields/`), redesigned `document-form.tsx`/`draft-publish-toolbar.tsx`; wire `LivePreviewIframe` `isReadyMessage` prop
- `apps/admin/.../content/pages/[id]/page.tsx` + articles — pass `livePreview` slot
- `apps/storefront/src/app/[domain]/[locale]/` — `preview-content-bridge.tsx` + draftMode-gated mount; `blocks/context.ts` (+preview/path); plain-text blocks emit gated `data-cms-field`

## Verification
build:packages → cms:gen:check → biome → typecheck → vitest (admin/cms/storefront) → playwright e2e (admin) → changesets. Assert normal storefront render has no bridge chunk / no `data-cms-field`.
