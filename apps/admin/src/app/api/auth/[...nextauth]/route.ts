import { authOptions } from '@/utils/auth';
import NextAuth from 'next-auth';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export type AuthApiRouteParams = {
    domain: string;
    nextauth: string[];
};
async function handler(req: NextRequest, context: { params: AuthApiRouteParams }) {
    const auth = await NextAuth(authOptions);

    return await auth(req, context);
}
export { handler as GET, handler as POST };
