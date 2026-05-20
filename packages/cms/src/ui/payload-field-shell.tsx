// Side-effect import: pulls Payload's bundled stylesheet into every route
// segment that renders <PayloadFieldShell>. Lives in the server entry (not
// the client inner) so Next.js can collect it into the route's CSS chunk
// during server rendering. Combined with `<html data-theme="dark">` set in
// apps/admin/src/app/(app)/layout.tsx, this is what turns Payload's
// otherwise-unstyled field components into a usable editor.
//
// Note: this CSS bundle is component styles ONLY — Payload's --theme-*
// and --color-base-* token ramps live in `dist/scss/colors.scss` which
// is NOT exposed by the package's exports map. We vendor those tokens
// into apps/admin/src/app/globals.css under `@layer payload-default` to
// keep them in sync without depending on the SCSS source.
import '@payloadcms/ui/css';

import { PayloadFieldShellInner, type PayloadFieldShellProps } from './payload-field-shell-inner';

export type { PayloadFieldShellProps };

/**
 * Server-component entry for the embedded Payload field shell. Forwards every
 * prop to a client inner that mounts `<RootProvider>` from `@payloadcms/ui`.
 *
 * The split exists so the CSS side-effect import above can live in a server
 * module — Next.js then bundles the stylesheet into the consuming route's
 * CSS chunk. Mounting the inner directly from app code skips the import and
 * leaves Payload's field components unstyled.
 *
 * All `PayloadFieldShellProps` fields are RSC-serializable:
 * - `ClientConfig`, `SanitizedPermissions`, `translations`: plain JSON
 * - `theme`, `languageCode`, `dateFNSKey`, `fallbackLang`: strings
 * - `languageOptions`: array of plain objects
 * - `user`: null or `TypedUser` (plain object)
 * - `serverFunction`: a `'use server'` action — Next.js serializes via action IDs
 *
 * Provider shell required by Payload field components and `<Form>` when
 * embedded outside the canonical `@payloadcms/next` admin shell.
 *
 * Delegates to `<RootProvider>` from `@payloadcms/ui`. That provider mounts
 * the BUNDLED copy of `@faceless-ui/modal`'s `ModalProvider` — the same
 * module instance that `useDocumentDrawer`, `<Drawer>`, and `<ModalContainer>`
 * inside `@payloadcms/ui` read from. Mounting `<ModalProvider>` directly
 * from `@faceless-ui/modal` (or via any path outside `@payloadcms/ui`'s
 * pre-bundled module graph) produces a *separate* `ModalContext` instance —
 * the provider sets one context but consumers read another (its default
 * empty object), leaving `modalState` undefined and crashing
 * `modalState[drawerSlug]` in `Drawer` on first paint of any upload, blocks,
 * or relationship field.
 *
 * `<RootProvider>` also mounts `ConfigProvider`, `ServerFunctionsProvider`,
 * `UploadHandlersProvider`, `AuthProvider`, `TranslationProvider`, theme
 * context, and all the other context entries Payload's field internals
 * read. Mounting individual providers piecemeal is brittle precisely
 * because @payloadcms/ui ships a single bundled module graph — every
 * context the bundle uses must come from the bundle.
 */
export function PayloadFieldShell(props: PayloadFieldShellProps) {
    return <PayloadFieldShellInner {...props} />;
}
