/* c8 ignore start */

export async function register() {
    const { registerOTel } = await import('@vercel/otel');
    registerOTel('Nordcom Commerce');

    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { registerInitialCache } = await import('@neshca/cache-handler/instrumentation');
        const CacheHandler = (await import('../data-cache-handler.mjs')).default;
        await registerInitialCache(CacheHandler, {});
    }
}
/* c8 ignore stop */
