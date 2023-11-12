import * as Sentry from '@sentry/nextjs';

Sentry.init({
    tracesSampleRate: (process.env.SENTRY_TRACES && Number.parseFloat(process.env.SENTRY_TRACES)) || 0.05,
    debug: process.env.SENTRY_DEBUG !== undefined || false
});
