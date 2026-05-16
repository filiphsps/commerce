export async function register() {
    if (process.env.NODE_ENV !== 'production') {
        return;
    }

    const { registerOTel } = await import('@vercel/otel');

    registerOTel('Nordcom Commerce');
}
