import type { CollectionEditorManifest } from './manifest';

/**
 * URL segment for a document id, or '' when the route addresses the document
 * without an id segment in the URL.
 *
 * Singleton-style routes use a sentinel id ('singleton' for kind:'scoped'
 * globals, the domain for kind:'singleton-by-domain') that has no
 * counterpart in the URL — the basePath already represents the doc.
 *
 * @example
 *   docUrlSegment(pagesEditor, '507f...') // '507f.../'
 *   docUrlSegment(footerEditor, 'singleton') // ''
 *   docUrlSegment(shopsEditor, 'beta.test') // ''
 */
export const docUrlSegment = (manifest: CollectionEditorManifest, id: string): string => {
    if (manifest.tenant.kind === 'singleton-by-domain') return '';
    if (id === 'singleton') return '';
    return `${id}/`;
};
