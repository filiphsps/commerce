import { docs } from '@/.source/server';
import { loader } from 'fumadocs-core/source';
import { docsEnv } from './env';

/**
 * Single Fumadocs source for the docs site. The four sidebar tabs (Docs at the
 * unprefixed root, then Packages / Reference / Errors as subfolders) come from
 * the single `content/` collection. `baseUrl` honours the runtime
 * `NEXT_PUBLIC_DOCS_BASE_PATH` so the docs app works at `/`, `/docs/`, and
 * `/commerce/` (GitHub Pages) without rewriting internal links by hand.
 */
export const source = loader({
    baseUrl: `${docsEnv.basePath}/`,
    source: docs.toFumadocsSource(),
});
