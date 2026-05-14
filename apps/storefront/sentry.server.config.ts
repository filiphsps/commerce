// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { SENTRY_DSN, SENTRY_IGNORE_ERRORS } from './sentry.shared';

if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,
        ignoreErrors: SENTRY_IGNORE_ERRORS,
        tracesSampleRate: 0.85,
        profilesSampleRate: 1.0,
        integrations: [nodeProfilingIntegration()],
        debug: false,

        // Uncomment the line below to enable Spotlight (https://spotlightjs.com)
        // spotlight: BuildConfig.environment === 'development',
    });
}
