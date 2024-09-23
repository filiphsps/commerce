// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

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

    tracesSampleRate: 0,
    debug: false
});
