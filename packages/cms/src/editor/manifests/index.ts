import type { CollectionEditorManifest } from '../manifest';
import { articlesEditor } from './articles';
import { businessDataEditor } from './business-data';
import { featureFlagsEditor } from './feature-flag';
import { footerEditor } from './footer';
import { headerEditor } from './header';
import { pagesEditor } from './pages';
import { productMetadataEditor } from './product-metadata';
import { reviewsEditor } from './review';
import { shopsEditor } from './shop';

export { articlesEditor } from './articles';
export { businessDataEditor } from './business-data';
export { featureFlagsEditor } from './feature-flag';
export { footerEditor } from './footer';
export { headerEditor } from './header';
export { pagesEditor } from './pages';
export { productMetadataEditor } from './product-metadata';
export { reviewsEditor } from './review';
export { shopsEditor } from './shop';

/**
 * Registry consumed by `pnpm cms:gen`. Every shipped manifest MUST be listed
 * here — the codegen reads this array to emit action wrappers per entry.
 */
export const allManifests: readonly CollectionEditorManifest[] = [
    articlesEditor as unknown as CollectionEditorManifest,
    businessDataEditor as unknown as CollectionEditorManifest,
    shopsEditor as unknown as CollectionEditorManifest,
    reviewsEditor as unknown as CollectionEditorManifest,
    featureFlagsEditor as unknown as CollectionEditorManifest,
    headerEditor as unknown as CollectionEditorManifest,
    footerEditor as unknown as CollectionEditorManifest,
    pagesEditor as unknown as CollectionEditorManifest,
    productMetadataEditor as unknown as CollectionEditorManifest,
];
