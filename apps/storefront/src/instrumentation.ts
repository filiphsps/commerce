export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    const { registerOTel } = await import('@vercel/otel');
    registerOTel('Nordcom Commerce');
}
