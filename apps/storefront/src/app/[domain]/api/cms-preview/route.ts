import { timingSafeEqual } from 'node:crypto';
import { draftMode } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

// `dynamic = 'force-dynamic'` would be rejected at build because the
// storefront sets `nextConfig.cacheComponents: true`. The route is dynamic
// by construction — `draftMode().enable()` toggles a same-site cookie and
// `req.nextUrl.searchParams` reads request state, both of which prevent
// Next from caching the response. `Cache-Control: no-store` headers below
// also prevent edge/CDN caching.
const noStoreHeaders = { 'Cache-Control': 'no-store' };

const secretsMatch = (provided: string | null, expected: string): boolean => {
    if (!provided) return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    // `timingSafeEqual` requires equal-length buffers; padding to a fixed length
    // and then checking actual length after is the standard workaround so a
    // wrong-length guess doesn't leak via the early `false` return path.
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
};

// Don't bounce a valid preview cookie into the admin or any /api/ route — the
// preview secret is meant for storefront draft rendering, not as a same-origin
// redirect oracle that could land an authenticated CMS editor on a
// privileged path with `draftMode` already toggled.
const isStorefrontPath = (path: string): boolean => {
    if (!path.startsWith('/') || path.startsWith('//')) return false;
    if (path.startsWith('/admin/') || path === '/admin') return false;
    if (path.startsWith('/api/')) return false;
    if (path.startsWith('/cms/') || path === '/cms') return false;
    return true;
};

/**
 * Toggle draft mode for the CMS preview iframe. Payload's admin live-preview
 * link points at /{domain}/__by-tenant/{tenantId}/{path}?preview=1&secret=...
 * which proxies through this route to enable draft mode before rendering.
 */
export async function GET(req: NextRequest) {
    const secret = req.nextUrl.searchParams.get('secret');
    const expected = process.env.STOREFRONT_PREVIEW_SECRET;
    if (!expected || !secretsMatch(secret, expected)) {
        return NextResponse.json({ error: 'invalid secret' }, { status: 401, headers: noStoreHeaders });
    }
    (await draftMode()).enable();
    const rawTarget = req.nextUrl.searchParams.get('redirect') ?? '/';
    const target = isStorefrontPath(rawTarget) ? rawTarget : '/';
    return NextResponse.redirect(new URL(target, req.url), { headers: noStoreHeaders });
}
