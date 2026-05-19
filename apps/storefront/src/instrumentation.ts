export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    const { registerPayload } = await import('@nordcom/commerce-db');
    const { getPayloadInstance } = await import('@nordcom/commerce-cms/api');
    registerPayload(getPayloadInstance);

    const { registerOTel } = await import('@vercel/otel');
    registerOTel('Nordcom Commerce');
}
