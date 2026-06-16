'use client';

import { useAuth } from '@clerk/nextjs';
import { MissingEnvironmentVariableError } from '@nordcom/commerce-errors';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import type { ReactNode } from 'react';

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    // A missing deployment URL would leave every authenticated Convex hook silently unauthenticated;
    // fail loud at module load so the misconfiguration surfaces in the build/boot, not as empty data.
    // `@nordcom/commerce-errors` is dependency-free and client-safe (no server-only import), so it is
    // safe to throw from this `'use client'` module.
    throw new MissingEnvironmentVariableError('NEXT_PUBLIC_CONVEX_URL');
}

/**
 * The browser-side Convex client. Module-scoped so a single client instance is shared across the
 * admin tree (re-instantiating per render would drop the in-flight auth/websocket state).
 */
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

/**
 * Bridges Clerk's session into the Convex React client for the admin app.
 *
 * Wraps the subtree in `ConvexProviderWithClerk`, handing it Clerk's `useAuth` so Convex requests a
 * `convex`-template JWT from the active Clerk session and re-mints it on token rotation. This is the
 * client-side counterpart to the server's {@link import('@/lib/clerk-convex-token').getAuthenticatedConvexClient};
 * both feed the same Convex Clerk provider declared in `packages/convex/convex/auth.config.ts`.
 *
 * @param props.children - Subtree that consumes authenticated Convex hooks.
 * @returns The provider wiring Clerk auth into Convex.
 */
export function ClerkConvexProvider({ children }: { children: ReactNode }) {
    return (
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            {children}
        </ConvexProviderWithClerk>
    );
}
