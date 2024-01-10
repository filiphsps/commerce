import { getAuthOptions } from '@/auth';
import { ShopApi } from '@nordcom/commerce-database';
import NextAuth from 'next-auth';
import { unstable_cache } from 'next/cache';
import { type NextRequest } from 'next/server';

export const runtime = 'nodejs';

export type AuthApiRouteParams = {
    domain: string;
    nextauth: string[];
};
async function handler(req: NextRequest, context: { params: AuthApiRouteParams }) {
    const {
        params: { domain }
    } = context;

    const shop = await ShopApi(domain, unstable_cache);

    const authOptions = await getAuthOptions({ shop });
    const auth = await NextAuth(authOptions);

    return await auth(req, context);
}
export { handler as GET, handler as POST };
