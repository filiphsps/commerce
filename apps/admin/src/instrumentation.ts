/* c8 ignore start */
export async function register() {
    const { registerOTel } = await import('@vercel/otel');

    registerOTel('Nordcom Commerce');
}
/* c8 ignore stop */
