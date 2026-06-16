import type { CollectionEditorManifest } from '../manifest';
import { articlesEditor } from './articles';
import { businessDataEditor } from './business-data';
import { collectionMetadataEditor } from './collection-metadata';
import { featureFlagsEditor } from './feature-flag';
import { footerEditor } from './footer';
import { headerEditor } from './header';
import { mediaEditor } from './media';
import { pagesEditor } from './pages';
import { productMetadataEditor } from './product-metadata';
import { reviewsEditor } from './review';
import { searchEditor } from './search';
import { shopsEditor } from './shop';
import { tenantsEditor } from './tenants';
import { usersEditor } from './users';

export { articlesEditor } from './articles';
export { businessDataEditor } from './business-data';
export { collectionMetadataEditor } from './collection-metadata';
export { featureFlagsEditor } from './feature-flag';
export { footerEditor } from './footer';
export { headerEditor } from './header';
export { mediaEditor } from './media';
export { pagesEditor } from './pages';
export { productMetadataEditor } from './product-metadata';
export { reviewsEditor } from './review';
export { searchEditor } from './search';
export { shopsEditor } from './shop';
export { tenantsEditor } from './tenants';
export { usersEditor } from './users';

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
    searchEditor as unknown as CollectionEditorManifest,
    mediaEditor as unknown as CollectionEditorManifest,
    pagesEditor as unknown as CollectionEditorManifest,
    productMetadataEditor as unknown as CollectionEditorManifest,
    collectionMetadataEditor as unknown as CollectionEditorManifest,
    tenantsEditor as unknown as CollectionEditorManifest,
    usersEditor as unknown as CollectionEditorManifest,
];
