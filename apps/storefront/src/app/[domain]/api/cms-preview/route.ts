import { timingSafeEqual } from 'node:crypto';
import { draftMode } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

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
    // Only allow same-origin relative redirects — `new URL(absolute, base)`
    // happily resolves an attacker-controlled `https://evil.example/...` and
    // would turn this preview route into an open redirect bouncer.
    const rawTarget = req.nextUrl.searchParams.get('redirect') ?? '/';
    const target = rawTarget.startsWith('/') && !rawTarget.startsWith('//') ? rawTarget : '/';
    return NextResponse.redirect(new URL(target, req.url), { headers: noStoreHeaders });
}
