/* c8 ignore start */
import { BuildConfig } from '@/utils/build-config';

export async function register() {
    if (BuildConfig.environment !== 'production') {
        return;
    }

    const { registerOTel } = await import('@vercel/otel');
    registerOTel('Nordcom Commerce');

    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('../sentry.server.config');
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('../sentry.edge.config');
    }
}
/* c8 ignore stop */
