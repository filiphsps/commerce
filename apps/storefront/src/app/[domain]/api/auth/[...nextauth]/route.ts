import { Shop } from '@nordcom/commerce-db';
import { Error as CommerceError } from '@nordcom/commerce-errors';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/auth';

// `dynamic = 'force-dynamic'` and `fetchCache` exports are rejected at build
// time when `nextConfig.cacheComponents` is on. The storefront uses
// cacheComponents for PPR; this route is already dynamic-by-construction
// because both handlers `await req.cookies` / call `getAuth(shop)` which
// reads request state — Next picks that up without an explicit segment hint.
// The `Cache-Control: no-store` headers below still prevent edge caching.
const noStoreHeaders = { 'Cache-Control': 'no-store' };

export type AuthRouteParams = Promise<{ domain: string }>;

const resolveShop = async (domain: string) => {
    try {
        return { shop: await Shop.findByDomain(domain, { sensitiveData: true }), error: null as null };
    } catch (error) {
        if (CommerceError.isNotFound(error)) {
            return {
                shop: null,
                error: NextResponse.json(
                    { error: 'shop not found' },
                    { status: 404, headers: noStoreHeaders },
                ),
            };
        }
        // Mongo timeouts and other infra failures must surface as 503 so
        // clients know to retry — silently 500-ing breaks the sign-in flow
        // with no obvious signal.
        console.error('[auth-route] Shop.findByDomain failed:', error);
        return {
            shop: null,
            error: NextResponse.json(
                { error: 'shop lookup failed' },
                { status: 503, headers: { ...noStoreHeaders, 'Retry-After': '15' } },
            ),
        };
    }
};

export async function GET(req: NextRequest, { params }: { params: AuthRouteParams }) {
    const { domain } = await params;
    const { shop, error } = await resolveShop(domain);
    if (error) return error;
    const {
        handlers: { GET },
    } = getAuth(shop);
    return await GET(req);
}

export async function POST(req: NextRequest, { params }: { params: AuthRouteParams }) {
    const { domain } = await params;
    const { shop, error } = await resolveShop(domain);
    if (error) return error;
    const {
        handlers: { POST },
    } = getAuth(shop);
    return await POST(req);
}
