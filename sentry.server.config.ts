// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
    enabled: process.env.NODE_ENV !== 'development',
    dsn: 'https://68464611058c4deab7022f9fec1134cc@o4505269537931264.ingest.sentry.io/4505269537931264',

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false
});
