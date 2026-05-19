export async function register() {
    // `register()` is also evaluated for the Edge runtime — Payload is Node-only,
    // so gate the boot to Node. Edge boots are a no-op (admin's middleware
    // doesn't touch the commerce-db service singletons).
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    const { bootServices } = await import('@/lib/boot-services');
    await bootServices();

    if (process.env.NODE_ENV === 'production') {
        const { registerOTel } = await import('@vercel/otel');
        registerOTel('Nordcom Commerce');
    }
}
