// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { init } from '@sentry/nextjs';

init({
    enabled: true,
    environment: process.env.NODE_ENV,
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false
});
