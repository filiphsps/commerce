import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const DOCS_DOMAIN = process.env.DOCS_DOMAIN ?? 'https://filiphsps.github.io/commerce/'; // TODO: Remove hard-coded url.

/**
 * Proxies the documentation site onto the landing app under `/docs/*`.
 *
 * The docs are a static export served from the `/commerce` base path on GitHub Pages, so their HTML
 * self-references `/commerce/_next/...` for assets and `/commerce/<page>` for links. Two public paths
 * therefore map onto the same upstream: `/docs/*` (the entry point we expose) and `/commerce/*` (the
 * base path the exported site emits). Both strip their leading segment and forward the remainder to
 * `DOCS_DOMAIN`, whose own `/commerce` suffix re-applies the upstream base path.
 *
 * @param req - Incoming Next.js proxy request.
 * @returns A rewrite response targeting the documentation origin.
 */
export const docs = async (req: NextRequest): Promise<NextResponse> => {
    const url = req.nextUrl.clone();

    // Strip only the LEADING `/docs` or `/commerce` segment — the anchored regex matches `/docs/...`,
    // `/docs`, `/commerce/...`, `/commerce`, but not `/docs-foo/...`.
    const rest = url.pathname.replace(/^\/(?:docs|commerce)(?=\/|$)/, '');
    const base = DOCS_DOMAIN.replace(/\/+$/, '');

    const target = new URL(`${base}${rest}`);
    target.search = url.search;

    return NextResponse.rewrite(target);
};
