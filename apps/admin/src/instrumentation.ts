export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    if (process.env.NODE_ENV === 'production') {
        const { registerOTel } = await import('@vercel/otel');
        registerOTel('Nordcom Commerce');
    }
}
