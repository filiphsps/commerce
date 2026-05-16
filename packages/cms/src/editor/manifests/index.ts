import type { CollectionEditorManifest } from '../manifest';
import { businessDataEditor } from './business-data';
import { featureFlagEditor } from './feature-flag';
import { reviewEditor } from './review';
import { shopEditor } from './shop';

export { businessDataEditor } from './business-data';
export { featureFlagEditor } from './feature-flag';
export { reviewEditor } from './review';
export { shopEditor } from './shop';

/**
 * Registry consumed by `pnpm cms:gen`. Every shipped manifest MUST be listed
 * here — the codegen reads this array to emit action wrappers per entry.
 */
export const allManifests: readonly CollectionEditorManifest[] = [
    businessDataEditor as unknown as CollectionEditorManifest,
    shopEditor as unknown as CollectionEditorManifest,
    reviewEditor as unknown as CollectionEditorManifest,
    featureFlagEditor as unknown as CollectionEditorManifest,
];
