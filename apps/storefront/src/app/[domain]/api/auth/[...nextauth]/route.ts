import { Shop } from '@nordcom/commerce-db';
import type { NextRequest } from 'next/server';
import { getAuth } from '@/auth';

export type AuthRouteParams = Promise<{ domain: string }>;

export async function GET(req: NextRequest, { params }: { params: AuthRouteParams }) {
    const { domain } = await params;

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const {
        handlers: { GET },
    } = getAuth(shop);

    return await GET(req);
}

export async function POST(req: NextRequest, { params }: { params: AuthRouteParams }) {
    const { domain } = await params;

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const {
        handlers: { POST },
    } = getAuth(shop);

    return await POST(req);
}
