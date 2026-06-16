import { clerkMiddleware } from '@clerk/nextjs/server';

export const config = {
    matcher: [
        // Run on every app route so Clerk can attach session context for downstream `auth()` reads; the
        // admin gates each route inside its own `auth()` / server component (see `lib/cms-ctx.ts`), so
        // this proxy stays a thin Clerk-context shim — it does NOT rewrite per tenant like the storefront.
        //
        // CRITICAL: the admin's tenant routes are `/[domain]/…` where the domain CONTAINS DOTS
        // (`/beta.pouched.de`). The common Clerk matcher excludes ANY path segment with a `.` (assuming a
        // static file), which skipped the middleware on every tenant route — so `auth()` threw "Clerk
        // can't detect usage of clerkMiddleware()". Exclude only KNOWN static EXTENSIONS instead: that
        // keeps `/favicon.ico` and friends out while letting `.de`/`.com`/… tenant paths through.
        '/((?!_next|_static|_vercel|instrumentation|assets|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
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
