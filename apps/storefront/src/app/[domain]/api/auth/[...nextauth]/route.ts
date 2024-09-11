import { findShopByDomainOverHttp } from '@/api/shop';
import { getAuthSession } from '@/auth';

import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest, { params: { domain } }: { params: { domain: string } }) {
    const shop = await findShopByDomainOverHttp(domain);
    const auth = await getAuthSession(shop);

    return await auth.handlers.GET(req);
}

export async function POST(req: NextRequest, { params: { domain } }: { params: { domain: string } }) {
    const shop = await findShopByDomainOverHttp(domain);
    const auth = await getAuthSession(shop);

    return await auth.handlers.POST(req);
}
