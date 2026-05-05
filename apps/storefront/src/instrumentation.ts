/* c8 ignore start */
export async function register() {
    const { registerOTel } = await import('@vercel/otel');
    registerOTel('Nordcom Commerce');

    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { registerInitialCache } = await import('@neshca/cache-handler/instrumentation');
        const CacheHandler = (await import('../data-cache-handler.mjs')).default;
        await registerInitialCache(CacheHandler, {});
    }

    const sentryConfigured = Boolean(process.env.SENTRY_AUTH_TOKEN);

    if (process.env.NEXT_RUNTIME === 'nodejs') {
        if (sentryConfigured) {
            await import('../sentry.server.config');
        }
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
        if (sentryConfigured) {
            await import('../sentry.edge.config');
        }
    }
}
/* c8 ignore stop */
