// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN, SENTRY_IGNORE_ERRORS } from './sentry.shared';

if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,
        ignoreErrors: SENTRY_IGNORE_ERRORS,
        tracesSampleRate: 0,
        debug: false,
        integrations: [],
    });
}
