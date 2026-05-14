import 'server-only';

import NextAuth from 'next-auth';

import { AuthAdapter } from './auth.adapter';
import config from './auth.config';

export type { Provider as AuthProvider } from 'next-auth/providers';

const buildAllowlist = (raw: string | undefined): Set<string> =>
    new Set(
        (raw ?? '')
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean),
    );

const ADMIN_ALLOWED_EMAILS = buildAllowlist(process.env.NORDCOM_ALLOWED_EMAILS);
const ADMIN_OPERATOR_EMAILS = buildAllowlist(process.env.NORDCOM_OPERATOR_EMAILS);

// Without an allowlist, any GitHub user who hits /auth/login/ becomes a
// Payload editor (the bridge auto-provisions on first sign-in). They get no
// shop access by default — but the OAuth-begin route at
// /integrations/shopify/api/ is gated only by `auth(...)`, so a self-signed-up
// editor can initiate a Shopify install for an arbitrary myshopify domain
// using *our* app's API key. Surface a loud warning when the env list is
// missing so this isn't silent in prod.
if (ADMIN_ALLOWED_EMAILS.size === 0 && ADMIN_OPERATOR_EMAILS.size === 0) {
    console.warn(
        '[auth] NORDCOM_ALLOWED_EMAILS and NORDCOM_OPERATOR_EMAILS are both empty — sign-in is open to any GitHub identity. Set NORDCOM_ALLOWED_EMAILS to a comma-separated list of permitted emails to lock this down.',
    );
}

export const {
    handlers: { GET, POST },
    signIn,
    signOut,
    auth,
} = NextAuth({
    adapter: AuthAdapter(),
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: `/auth/login/`,
        signOut: `/auth/logout/`,
        error: '/auth/login/',
    },
    callbacks: {
        async signIn({ user }) {
            const email = user?.email?.trim().toLowerCase();
            if (!email) return false;
            // No allowlist configured at all → permissive (already warned at
            // module load). This preserves the current dev-time experience
            // without silently keeping prod open.
            if (ADMIN_ALLOWED_EMAILS.size === 0 && ADMIN_OPERATOR_EMAILS.size === 0) return true;
            return ADMIN_ALLOWED_EMAILS.has(email) || ADMIN_OPERATOR_EMAILS.has(email);
        },
        async session({ token, session, ..._args }) {
            return {
                ...session,
                user: {
                    ...session.user,
                    id: token.sub,
                },
                ...token,
            };
        },
        async jwt({ token, ..._args }) {
            return token;
        },
    },
    ...config,
});
