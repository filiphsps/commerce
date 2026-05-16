import type { CollectionEditorManifest } from '../manifest';
import { businessDataEditor } from './business-data';
import { featureFlagsEditor } from './feature-flag';
import { reviewsEditor } from './review';
import { shopsEditor } from './shop';

export { businessDataEditor } from './business-data';
export { featureFlagsEditor } from './feature-flag';
export { reviewsEditor } from './review';
export { shopsEditor } from './shop';

/**
 * Registry consumed by `pnpm cms:gen`. Every shipped manifest MUST be listed
 * here — the codegen reads this array to emit action wrappers per entry.
 */
export const allManifests: readonly CollectionEditorManifest[] = [
    businessDataEditor as unknown as CollectionEditorManifest,
    shopsEditor as unknown as CollectionEditorManifest,
    reviewsEditor as unknown as CollectionEditorManifest,
    featureFlagsEditor as unknown as CollectionEditorManifest,
];
