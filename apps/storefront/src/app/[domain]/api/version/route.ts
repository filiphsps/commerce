import { createVersionRoute } from 'next-build-notifier/server';

// No `export const dynamic = 'force-dynamic'` — it's incompatible with `cacheComponents`, and it's
// unnecessary: this route lives under the dynamic `[domain]` segment with no `generateStaticParams`,
// so Next renders it on demand per request (never prerendered). The `Cache-Control: no-store` header
// (set by createVersionRoute) additionally stops CDN/browser caching so a polling client always sees
// the live deployment's id.

/** Tenant-scoped version endpoint; the build id is global, tenant-scoping keeps it under the
 * hostname rewrite so a relative client fetch to `/api/version` resolves correctly. */
export const { GET } = createVersionRoute();
