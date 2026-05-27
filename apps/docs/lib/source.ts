import { docs, errors, packages, reference } from '@/.source/server';
import { loader } from 'fumadocs-core/source';
import { docsEnv } from './env';

/**
 * Single Fumadocs source for the docs site. `baseUrl` honours the runtime
 * `NEXT_PUBLIC_DOCS_BASE_PATH` so the docs app works at `/`, `/docs/`, and
 * `/commerce/` (GitHub Pages) without rewriting internal links by hand.
 *
 * @returns The Fumadocs source — call `.getPage()`, `.generateParams()`, etc.
 */
export const source = loader({
    baseUrl: `${docsEnv.basePath}/`,
    source: {
        docs: docs.toFumadocsSource(),
        packages: packages.toFumadocsSource(),
        reference: reference.toFumadocsSource(),
        errors: errors.toFumadocsSource(),
    },
});
