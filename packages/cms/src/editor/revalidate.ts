import type { CollectionEditorManifest } from './manifest';

/**
 * The storefront revalidation vocabulary, re-exported so editor code that reasons about cache
 * busting lands on the SAME schema the Convex bridge derives tags from. Storefront invalidation is
 * owned entirely by the Convex publish path — `cms/actions.ts` publish → `cms/documents.ts` save →
 * `revalidate/onPublish.ts`, which derives tags via `revalidate/tags.ts`'s `deriveRevalidateTags`
 * over this exact schema (BRIDGE-03). The editor never computes a storefront tag itself; there is
 * deliberately no second vocabulary to drift.
 */
export { type CmsTenant, cmsCacheSchema, cmsTenantRootTags } from '../cache-descriptor';

/**
 * Arguments for {@link refreshEditorPaths}. Accepts an injected `revalidatePath` so the helper is
 * callable from tests without importing `next/cache`.
 *
 * @example
 * refreshEditorPaths({ manifest: pagesEditor, domain: 'beta.test', doc, status: 'published', revalidatePath });
 */
export type RefreshEditorPathsArgs = {
    manifest: CollectionEditorManifest;
    domain: string | null;
    doc: unknown;
    status: 'draft' | 'published';
    /** Injected so the helper is pure-callable from tests without next/cache. */
    revalidatePath: (path: string) => void;
};

/**
 * Refresh the ADMIN app's own manifest-declared routes (list pages, edit views) after a write.
 * No-op when `manifest.revalidate` is undefined.
 *
 * This is operator UX only — it never busts storefront caches. Storefront tags derive Convex-side
 * from the publish hook (see the module re-export note above), so the published transition is the
 * only thing that revalidates a storefront, and a draft/autosave save fires zero storefront
 * revalidation by construction.
 *
 * @param args - See {@link RefreshEditorPathsArgs}.
 *
 * @example
 * refreshEditorPaths({ manifest: pagesEditor, domain, doc, status: 'published', revalidatePath });
 */
export const refreshEditorPaths = ({ manifest, domain, doc, status, revalidatePath }: RefreshEditorPathsArgs): void => {
    const paths = manifest.revalidate?.({ domain, doc, status }) ?? [];
    for (const p of paths) revalidatePath(p);
};
