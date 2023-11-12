import * as Sentry from '@sentry/nextjs';

Sentry.init({
    tracesSampleRate: (process.env.SENTRY_TRACES && Number.parseFloat(process.env.SENTRY_TRACES)) || 0.05,
    debug: process.env.SENTRY_DEBUG !== undefined || false,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: (process.env.NODE_ENV === 'development' && 1) || 0.05,
    integrations: [
        new Sentry.Replay({
            maskAllText: false,
            maskAllInputs: false,
            blockAllMedia: false
        })
    ]
});
