import { authOptions } from '#/utils/auth';
import { withEdgeHighlight } from '@/utils/config/highlight.edge';
import NextAuth from 'next-auth';

export const runtime = 'experimental-edge';
const handler = withEdgeHighlight(NextAuth(authOptions) as any);

export { handler as GET, handler as POST };
