import type { CollectionEditorManifest } from './manifest';

/**
 * URL segment for a document id, or '' when the route addresses the document
 * without an id segment in the URL.
 *
 * Singleton-style routes have no id counterpart in the URL — the basePath
 * already represents the doc. Three shapes:
 *   - `kind: 'tenant-singleton'` (one doc per tenant, e.g. footer/header) — always ''.
 *   - `kind: 'singleton-by-domain'` (one doc per domain, e.g. shops) — always ''.
 *   - Legacy `id === 'singleton'` sentinel used by `kind: 'scoped'` callers
 *     pending migration to `tenant-singleton`.
 *
 * @example
 *   docUrlSegment(pagesEditor, '507f...') // '507f.../'
 *   docUrlSegment(footerEditor, '') // ''
 *   docUrlSegment(shopsEditor, 'beta.test') // ''
 */
export const docUrlSegment = (manifest: CollectionEditorManifest, id: string): string => {
    if (manifest.tenant.kind === 'singleton-by-domain') return '';
    if (manifest.tenant.kind === 'tenant-singleton') return '';
    if (id === 'singleton') return '';
    return `${id}/`;
};
