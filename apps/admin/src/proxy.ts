import { clerkMiddleware } from '@clerk/nextjs/server';

export const config = {
    matcher: [
        // Skip Next.js internals + any path with a file extension, but always run on app routes so
        // Clerk can attach session context. The admin gates each route inside its own `auth()` /
        // server component (see `lib/cms-ctx.ts`), so this proxy stays a thin Clerk-context shim — it
        // does NOT rewrite per tenant like the storefront, nor enforce route protection here.
        '/((?!_next|_static|_vercel|instrumentation|assets|favicon.ico|[\\w-]+\\.\\w+).*)',
    ],
    missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
    ],
};

/**
 * Top-level admin proxy (Next.js 16's renamed middleware): `clerkMiddleware()` with no custom
 * handler, so every request carries a resolvable Clerk session for the downstream `auth()` reads
 * without this layer adding any logic.
 *
 * Route protection is enforced per-surface inside the server components via `auth()` (`lib/cms-ctx.ts`
 * and the page-level redirects), and the legacy `/cms/*` back-compat redirect lives in
 * `next.config.js`'s `redirects()` — so this stays a handler-free Clerk-context shim.
 */
export default clerkMiddleware();
