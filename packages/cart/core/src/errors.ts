/**
 * Base class for every cart-core domain error. Consumers match on
 * `error.name` rather than `instanceof` because cart-core errors can cross
 * package boundaries (SSR → client, worker → main) where the constructor
 * identity isn't preserved.
 */
export class CartError extends Error {
    /**
     * @param message - Human-readable description suitable for logs.
     * @param cause - Optional underlying error chained for diagnostics.
     */
    constructor(
        message: string,
        public override readonly cause?: unknown,
    ) {
        super(message);
        this.name = 'CartError';
    }
}

/**
 * Thrown by adapters when a cart id is resolvable in the request but no cart
 * exists upstream — distinct from a transport failure.
 */
export class CartNotFoundError extends CartError {
    /**
     * @param cartId - The missing cart identifier, included in the message.
     */
    constructor(public readonly cartId: string) {
        super(`Cart not found: ${cartId}`);
        this.name = 'CartNotFoundError';
    }
}

/**
 * Thrown for transport / upstream-API failures (network, 5xx, malformed
 * payloads). Retry middleware treats this as retryable.
 */
export class CartProviderError extends CartError {
    /**
     * @param message - Cause summary for logs.
     * @param cause - Underlying error preserved for diagnostics.
     */
    constructor(message: string, cause?: unknown) {
        super(message, cause);
        this.name = 'CartProviderError';
    }
}

export type CartUserErrorEntry = { field?: string; message: string };

/**
 * Thrown when the upstream provider rejects a mutation due to caller-supplied
 * input (e.g. invalid discount code, quantity exceeds stock). Retry middleware
 * does NOT retry these.
 */
export class CartUserError extends CartError {
    /**
     * @param userErrors - Field-scoped messages from the provider; surfaced
     *   back to the UI for display.
     */
    constructor(public readonly userErrors: CartUserErrorEntry[]) {
        super(userErrors.map((e) => e.message).join('; '));
        this.name = 'CartUserError';
    }
}

/**
 * Thrown by the kernel when a mutation requires a capability the active
 * adapter doesn't advertise (e.g. gift cards on a provider without them).
 */
export class CartCapabilityUnsupportedError extends CartError {
    /**
     * @param capability - Capability name as declared on
     *   {@link CartCapabilities}, surfaced for diagnostics + UI.
     */
    constructor(public readonly capability: string) {
        super(`Capability not supported: ${capability}`);
        this.name = 'CartCapabilityUnsupportedError';
    }
}
