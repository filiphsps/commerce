import { ShopApi } from '@/api/shop';
import { getAuthOptions } from '@/auth';
import NextAuth from 'next-auth';
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

    const shop = await ShopApi(domain);

    const authOptions = await getAuthOptions({ shop });
    const auth = await NextAuth(authOptions);

    return await auth(req, context);
}
export { handler as GET, handler as POST };
