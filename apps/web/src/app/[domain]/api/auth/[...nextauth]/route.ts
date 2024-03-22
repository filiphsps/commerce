import { unstable_cache as cache } from 'next/cache';
import { type NextRequest } from 'next/server';
import NextAuth from 'next-auth';

import { ShopApi } from '@nordcom/commerce-database';

import { getAuthOptions } from '@/auth';

export const runtime = 'nodejs';

export type AuthApiRouteParams = {
    domain: string;
    nextauth: string[];
};
async function handler(req: NextRequest, context: { params: AuthApiRouteParams }) {
    const {
        params: { domain }
    } = context;

    const shop = await ShopApi(domain, cache);

    const authOptions = await getAuthOptions({ shop });
    const auth = await NextAuth(authOptions);

    return await auth(req, context);
}
export { handler as GET, handler as POST };
