import { createVersionRoute } from 'next-build-notifier/server';

// Force per-request execution so the endpoint always reflects the live deployment's build id.
// `force-dynamic` is valid here because `cacheComponents` is not enabled in this app's next.config
// (the storefront, which enables cacheComponents, instead relies on its dynamic `[domain]` segment).
// createVersionRoute also sets Cache-Control: no-store to stop CDN/browser caching.
export const dynamic = 'force-dynamic';

/** Build-version endpoint; a polling client fetches this to detect when a newer build is deployed. */
export const { GET } = createVersionRoute();
