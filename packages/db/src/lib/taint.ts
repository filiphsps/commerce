/**
 * Re-applies React's `experimental_taintUniqueValue` to a secret AFTER it has crossed the Convex
 * HTTP boundary. Taint registrations do not survive serialization: the Mongoose-era values were
 * tainted once at the Shopify-client boundary and stayed in-process, but a Convex read hands back a
 * fresh deserialized string, so the seam must re-taint `token`/`clientSecret` the moment they are
 * re-attached to a sensitive shop payload. Resolved dynamically because the taint API only exists
 * on React's server builds — plain Node test runtimes (and any non-RSC consumer) simply no-op here,
 * and the storefront's consumption-side taint in `api/shopify.ts` remains as the second layer.
 *
 * @param value - The secret to taint; non-string or empty values are ignored.
 */
export async function taintSecret(value: unknown): Promise<void> {
    if (typeof value !== 'string' || value.length === 0) {
        return;
    }
    try {
        const react = (await import('react')) as {
            experimental_taintUniqueValue?: (message: string, lifetime: object, value: string) => void;
        };
        react.experimental_taintUniqueValue?.('Do not pass private tokens to the client', globalThis, value);
    } catch {
        // `react` is unresolvable in this runtime (e.g. a bare Node script importing the seam).
        // Taint is defense-in-depth on top of the structural shopCredentials split, so degrade to
        // the structural guarantee instead of failing the read.
    }
}
