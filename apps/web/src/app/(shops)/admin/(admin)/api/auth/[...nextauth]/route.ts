import { authOptions } from '#/utils/auth';
import NextAuth from 'next-auth';
import { withAppRouterHighlight } from '@/utils/config/highlight';

const handler = withAppRouterHighlight(NextAuth(authOptions) as any);

export { handler as GET, handler as POST };
