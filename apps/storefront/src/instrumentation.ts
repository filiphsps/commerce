export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    const { bootServices } = await import('@/lib/boot-services');
    await bootServices();

    const { registerOTel } = await import('@vercel/otel');
    registerOTel('Nordcom Commerce');
}
