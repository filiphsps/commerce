import { router } from '@/middleware/router';
import type { NextRequest } from 'next/server';

export const runtime = 'experimental-edge';
export const config = {
    matcher: ['/((?!storefront|admin|unknown|_next|_static|slice-simulator|instrumentation).*)']
};

export default async function middleware(req: NextRequest) {
    return router(req);
}
