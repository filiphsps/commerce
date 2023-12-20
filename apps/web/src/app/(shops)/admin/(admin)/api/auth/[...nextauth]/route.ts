import { authOptions } from '#/utils/auth';
import { withAppRouterHighlight } from '@/utils/config/highlight.app';
import NextAuth from 'next-auth';

export const runtime = 'nodejs';
const handler = withAppRouterHighlight(NextAuth(authOptions) as any);

export { handler as GET, handler as POST };
