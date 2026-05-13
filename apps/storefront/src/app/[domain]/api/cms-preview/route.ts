import { draftMode } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

const noStoreHeaders = { 'Cache-Control': 'no-store' };

/**
 * Toggle draft mode for the CMS preview iframe. Payload's admin live-preview
 * link points at /{domain}/__by-tenant/{tenantId}/{path}?preview=1&secret=...
 * which proxies through this route to enable draft mode before rendering.
 */
export async function GET(req: NextRequest) {
    const secret = req.nextUrl.searchParams.get('secret');
    const expected = process.env.STOREFRONT_PREVIEW_SECRET;
    if (!expected || secret !== expected) {
        return NextResponse.json({ error: 'invalid secret' }, { status: 401, headers: noStoreHeaders });
    }
    (await draftMode()).enable();
    const target = req.nextUrl.searchParams.get('redirect') ?? '/';
    return NextResponse.redirect(new URL(target, req.url), { headers: noStoreHeaders });
}
