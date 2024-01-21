export async function register() {
    const { registerOTel } = await import('@vercel/otel');
    registerOTel('Nordcom Commerce - Storefront');
}
