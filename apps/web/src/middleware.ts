import { router } from '@/middleware/router';
import { type NextRequest } from 'next/server';

export const runtime = 'experimental-edge';
export const config = {
    matcher: ['/((?!storefront|admin|unknown|_next|_static|_vercel|instrumentation|highlight-events).*)'],
    missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' }
    ]
};

export default async function middleware(req: NextRequest) {
    return router(req);
}
