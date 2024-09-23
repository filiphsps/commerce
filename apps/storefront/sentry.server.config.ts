// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
    dsn: 'https://69f04d1649cfe353ec27e6a30ca412d5@o4506147853828096.ingest.us.sentry.io/4507483915091968',

    ignoreErrors: [
        'ApolloError',
        'HierarchyRequestError',
        'InvalidContentProviderError',
        'NoLocalesAvailableError',
        'Response not successful',
        'The operation would yield an incorrect node tree.',
        'TodoError',
        "Failed to execute 'removeChild'",
        `Unexpected token`
    ],

    tracesSampleRate: 0.85,
    profilesSampleRate: 1.0,
    integrations: [nodeProfilingIntegration()],
    debug: false

    // Uncomment the line below to enable Spotlight (https://spotlightjs.com)
    // spotlight: BuildConfig.environment === 'development',
});
