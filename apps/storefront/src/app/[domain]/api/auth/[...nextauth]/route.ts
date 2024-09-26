import { findShopByDomainOverHttp } from '@/api/shop';
import { getAuth } from '@/auth';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export type AuthRouteParams = Promise<{ domain: string }>;

export async function GET(req: NextRequest, { params }: { params: AuthRouteParams }) {
    const { domain } = await params;

    const shop = await findShopByDomainOverHttp(domain);
    const {
        handlers: { GET }
    } = getAuth(shop);

    return await GET(req);
}

export async function POST(req: NextRequest, { params }: { params: AuthRouteParams }) {
    const { domain } = await params;

    const shop = await findShopByDomainOverHttp(domain);
    const {
        handlers: { POST }
    } = getAuth(shop);

    return await POST(req);
}
