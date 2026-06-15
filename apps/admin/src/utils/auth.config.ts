import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';

import { LANDING_DOMAIN } from '@/utils/domains';
import { gravatarUrl } from '@/utils/gravatar';

const IS_PROD = process.env.NODE_ENV === 'production';
// Vercel preview deploys run with `NODE_ENV === 'production'` but are served on an ephemeral
// `*.vercel.app` host, so the production cookie domain (`.${LANDING_DOMAIN}`) can never match.
// `VERCEL_ENV` is the Vercel-injected signal that distinguishes a preview build from the real one.
const IS_PREVIEW = process.env.VERCEL_ENV === 'preview';

// Auth.js v5's default session cookie name is `__Secure-authjs.session-token`
// (note `authjs.` prefix, not the legacy `next-auth.` from NextAuth v4).
// Keep that default name — overriding it to `next-auth.session-token` made
// the CSRF/callback cookies (which we don't override and which use Auth.js
// defaults `authjs.*`) inconsistent with the session token, and the
// co-located admin routes (which read `await auth()` via
// `getAuthedCmsCtx`) would silently fall back to "no session" in prod.
//
// Only override the cookie OPTIONS here (domain, secure flag) so the cookie
// is shared across `.${LANDING_DOMAIN}` subdomains.
export default {
    // On preview deploys the deployment URL is not known ahead of time, so OAuth can't register a
    // per-deploy `redirect_uri`. `AUTH_REDIRECT_PROXY_URL` points OAuth at the stable production
    // admin (`https://<admin>/api/auth`), which holds the single registered GitHub callback and
    // forwards the verified response back to the originating preview via the `state` param. The
    // proxy only activates when the stable deployment also has the var set, and both sides must
    // share `AUTH_SECRET` to decrypt that state. Inert (undefined) outside Vercel.
    redirectProxyUrl: process.env.AUTH_REDIRECT_PROXY_URL,
    providers: [
        GitHub({
            clientId: process.env.GITHUB_ID as string,
            clientSecret: process.env.GITHUB_TOKEN as string,

            profile({ id, name, email, login }) {
                const resolvedEmail = email || login;
                return {
                    id: id.toString(),
                    name: name,
                    email: resolvedEmail,
                    // Operator avatars come from Gravatar (admin-only), not GitHub. The image is a
                    // pure function of the email, so it stays consistent with the account page and
                    // the shell header rather than depending on the provider's `avatar_url`.
                    image: gravatarUrl(resolvedEmail),
                };
            },
        }),
    ],
    cookies: {
        sessionToken: {
            // Use Auth.js v5's canonical name. `__Secure-` prefix is applied
            // in production (NODE_ENV === 'production') to scope cookies to HTTPS.
            name: `${IS_PROD ? '__Secure-' : ''}authjs.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                // Scope to the shared `.${LANDING_DOMAIN}` apex only on the real production host.
                // A preview deploy is served on `*.vercel.app`, so the apex-scoped cookie would
                // never be sent back — fall back to a host-only cookie (still `__Secure-`/`secure`
                // over the preview's HTTPS) so the session sticks to the preview host.
                domain: IS_PROD && !IS_PREVIEW ? `.${LANDING_DOMAIN}` : undefined,
                secure: IS_PROD,
            },
        },
    },
    // Accept either secret env name so a prod
    // deployment that sets only `NEXTAUTH_SECRET` (the Auth.js v5 default) or
    // only `AUTH_SECRET` (the older name) doesn't end up with one half of the
    // app encrypting cookies with one secret and the other half trying to
    // decrypt with another.
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
    debug: false,
} satisfies NextAuthConfig;
