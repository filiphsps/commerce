// Shared Sentry config — DSN comes from env so preview/staging can route to
// a separate project (or skip entirely), and the ignoreErrors list lives in
// one place so it can't drift across the client/server/edge configs.
//
// `NEXT_PUBLIC_SENTRY_DSN` is the canonical env var. Leave it unset to skip
// Sentry init entirely (useful for previews, local dev). `SENTRY_DSN` (no
// `NEXT_PUBLIC_` prefix) is honoured as a server-side fallback for the
// server/edge configs.

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN ?? '';

export const SENTRY_IGNORE_ERRORS = [
    'ApolloError',
    'HierarchyRequestError',
    'InvalidContentProviderError',
    'NoLocalesAvailableError',
    'Response not successful',
    'The operation would yield an incorrect node tree.',
    'TodoError',
    "Failed to execute 'removeChild'",
    'Unexpected token',
];
