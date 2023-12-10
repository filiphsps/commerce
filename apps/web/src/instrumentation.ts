import { highlightConfig } from '@/utils/config/highlight';

export async function register() {
    const { registerOTel } = await import('@vercel/otel');
    const { registerHighlight } = await import('@highlight-run/next/server');

    registerOTel('Nordcom Commerce');
    registerHighlight({
        ...highlightConfig,
        serviceName: 'Nordcom Commerce'
    });
}
