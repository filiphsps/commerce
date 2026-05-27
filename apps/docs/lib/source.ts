import { loader } from 'fumadocs-core/source';
import { docs } from '@/.source/server';

/**
 * Single Fumadocs source for the docs site. The four sidebar tabs (Docs at the
 * unprefixed root, then Packages / Reference / Errors as subfolders) come from
 * the single `content/` collection. `baseUrl` stays at `/` because Next.js
 * applies `basePath` (e.g. `/commerce` on GitHub Pages, `/docs` for the
 * microfrontend) to every `<Link>` at render time — baking it in here too
 * produces doubled prefixes like `/commerce/commerce/…` in the sidebar.
 */
export const source = loader({
    baseUrl: '/',
    source: docs.toFumadocsSource(),
});
