import type { CollectionEditorManifest } from '../manifest';
import { businessDataEditor } from './business-data';

export { businessDataEditor } from './business-data';

/**
 * Registry consumed by `pnpm cms:gen`. Every shipped manifest MUST be listed
 * here — the codegen reads this array to emit action wrappers per entry.
 */
export const allManifests: readonly CollectionEditorManifest[] = [
    businessDataEditor as unknown as CollectionEditorManifest,
];
