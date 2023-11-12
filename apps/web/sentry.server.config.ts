import { init } from '@sentry/nextjs';

init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: (process.env.SENTRY_TRACES && Number.parseFloat(process.env.SENTRY_TRACES)) || 0.05,
    debug: process.env.SENTRY_DEBUG !== undefined || false,

    defaultIntegrations: false,
    integrations: []
});
