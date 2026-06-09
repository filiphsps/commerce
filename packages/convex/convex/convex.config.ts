import actionRetrier from '@convex-dev/action-retrier/convex.config.js';
import prosemirrorSync from '@convex-dev/prosemirror-sync/convex.config.js';
import { defineApp } from 'convex/server';

/**
 * Convex component registration for `@nordcom/commerce-convex`. Components are installed sub-deployments
 * with their own tables, functions, and schedulers; registering them here is what makes their generated
 * API surface available on `components.*` in `_generated/api`.
 *
 * `actionRetrier` (`@convex-dev/action-retrier`) backs the durable revalidation-delivery layer
 * (BRIDGE-07): it re-executes the `revalidate/notify` action under bounded exponential backoff and
 * invokes an `onComplete` callback exactly once when a run terminates, which the delivery layer uses to
 * dead-letter and alert on retry exhaustion. Its retry bookkeeping lives in the component's OWN tables,
 * kept off this package's schema.
 *
 * `prosemirrorSync` (`@convex-dev/prosemirror-sync`) backs CMS rich-text authoring (CMSRICH-01): it owns
 * the snapshot/steps tables and the collaborative-sync protocol for a ProseMirror/Tiptap document, so the
 * editor stores ProseMirror JSON rather than the dropped Lexical format. Each localized rich-text bucket
 * binds to one sync document id (see `tables/cms-prosemirror.ts`); the sync endpoints exposed to the
 * `useTiptapSync` hook are the deferred half of this integration (the component's client class pulls
 * `@tiptap/pm` into the backend bundle), so only the component — and its `components.prosemirrorSync`
 * API surface — is wired here. Its document storage lives in the component's OWN tables, off this schema.
 */
const app = defineApp();
app.use(actionRetrier);
app.use(prosemirrorSync);

export default app;
