import 'server-only';

import type { AuthStrategy } from 'payload';
import { auth } from '@/auth';

/**
 * Bridge NextAuth → Payload for the `serverFunction` dispatch path.
 *
 * Payload's `<ServerFunctionsProvider>` calls `cmsServerFunction`, which
 * delegates to `@payloadcms/next`'s `handleServerFunctions`. That handler
 * runs `executeAuthStrategies` to populate `req.user` before forwarding to
 * the registered server function (form-state, render-list, render-document,
 * …). With no strategy registered, `req.user` is `null` and every server
 * function the editor invokes — most visibly `render-list` on collection
 * navigation — throws `UnauthorizedError`.
 *
 * The route-level auth in `getAuthedPayloadCtx` doesn't apply here: that
 * helper runs inside server components, not inside the server-function
 * handler. The handler builds its own `req` and never sees the value.
 *
 * This strategy resolves the session through NextAuth's `auth()` helper —
 * the same path the route-level helper uses — instead of decrypting the
 * JWE cookie manually. That avoids the cookie-name / JWE-key / silent-null
 * failure modes the previous in-package strategy had (see the comment in
 * `lib/payload-ctx.ts`); the only failure modes that remain are the ones
 * `auth()` already surfaces and the Mongo lookup itself.
 */
export const nextAuthStrategy: AuthStrategy = {
    name: 'nextauth',
    authenticate: async ({ payload }) => {
        const session = await auth();
        const email = session?.user?.email?.trim().toLowerCase();
        if (!email) return { user: null };

        const { docs } = await payload.find({
            collection: 'users',
            where: { email: { equals: email } },
            limit: 1,
            overrideAccess: true,
        });
        const userDoc = docs[0];
        if (!userDoc) return { user: null };

        // Payload looks for `collection` on `req.user` to resolve access
        // predicates; without it, every collection-scoped permission check
        // returns false and `canAccessAdmin` rejects the request.
        return {
            user: {
                ...userDoc,
                collection: 'users',
                _strategy: 'nextauth',
            } as never,
        };
    },
};
