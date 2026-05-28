import type { CurrencyCode, Money } from './money';

export type { CurrencyCode, Money } from './money';

/**
 * Language-country-currency triple that parameterizes every adapter call.
 * Ensures currency is always co-located with locale so adapters never have
 * to infer it from context.
 *
 * @example
 * ```ts
 * const locale: LocaleTuple = { language: 'en', country: 'US', currency: 'USD' };
 * const ctx: AdapterCtx = { shop: {}, locale, logger: consoleLogger };
 * ```
 */
export type LocaleTuple = { language: string; country: string; currency: CurrencyCode };

/**
 * Optional contact details attached to an active cart to identify the buyer.
 * Pass to `createCart` or via the `update-buyer-identity` mutation when the
 * consumer logs in or checks out as a guest.
 *
 * @example
 * ```ts
 * const identity: BuyerIdentity = { email: 'buyer@example.com', countryCode: 'US' };
 * await kernel.mutate(ctx, { kind: 'update-buyer-identity' });
 * ```
 */
export type BuyerIdentity = {
    email?: string;
    phone?: string;
    countryCode?: string;
    provider?: { type: string; data: Record<string, unknown> };
};

/**
 * Extension slot that lets adapter authors attach arbitrary provider-specific
 * data to {@link Cart} and {@link CartLine} without widening the core types.
 * Pass a concrete shape as the `TExt` generic to unlock typed `custom` fields.
 *
 * @example
 * ```ts
 * type ShopifyExt = CartExt & { cart: { checkoutToken: string }; line: { sellingPlanId?: string } };
 * type ShopifyCart = Cart<ShopifyExt>;
 * ```
 */
export type CartExt = { cart?: unknown; line?: unknown };

/**
 * Snapshot of the variant-level product data attached to a cart line.
 * Captured at add-to-cart time so the cart displays correct titles and prices
 * even when the variant is later modified or removed in the catalog.
 *
 * @example
 * ```ts
 * const { productTitle, unitPrice } = line.merchandise;
 * ```
 */
export type CartLineMerchandise = {
    id: string;
    productId: string;
    productHandle: string;
    productTitle: string;
    productVendor: string | null;
    productType: string | null;
    variantTitle: string;
    image: { url: string; altText: string | null; width: number; height: number } | null;
    selectedOptions: Array<{ name: string; value: string }>;
    unitPrice: Money;
    compareAtUnitPrice: Money | null;
    availableForSale: boolean;
    quantityAvailable: number | null;
    sku: string | null;
};

/**
 * A single line item in a {@link Cart}, combining a quantity, merchandise
 * snapshot, and line-level cost breakdown. The `L` generic carries optional
 * provider-specific extensions (from {@link CartExt}).
 *
 * @example
 * ```ts
 * const totalItems = cart.lines.reduce((n, l) => n + l.quantity, 0);
 * ```
 */
export type CartLine<L = {}> = {
    id: string;
    quantity: number;
    merchandise: CartLineMerchandise;
    cost: { subtotal: Money; total: Money };
    attributes: Array<{ key: string; value: string }>;
    discountAllocations: Array<{ discountedAmount: Money; title?: string; code?: string }>;
    custom: L;
};

/**
 * Full cart state returned by the kernel after every read or mutation. The
 * `TExt` generic carries provider-specific extensions added by the adapter.
 * Treat this value as an immutable snapshot — the kernel always returns a new
 * object after each mutation.
 *
 * @example
 * ```ts
 * const cart: Cart = await kernel.create(ctx);
 * console.log(cart.totalQuantity, cart.cost.subtotal.amount);
 * ```
 */
export type Cart<TExt extends CartExt = {}> = {
    id: string;
    providerType: string;
    totalQuantity: number;
    checkoutUrl: string | null;
    lines: CartLine<TExt['line']>[];
    cost: { subtotal: Money; total: Money | null; tax: Money | null; shipping: Money | null };
    costStale: boolean;
    discountCodes: Array<{ code: string; applicable: boolean }>;
    giftCards: Array<{ id: string; lastCharacters: string; amountLeft: Money }>;
    buyerIdentity: BuyerIdentity | null;
    note: string | null;
    attributes: Array<{ key: string; value: string }>;
    updatedAt: string;
    custom: TExt['cart'];
};

/**
 * Minimal input needed to add a variant to a cart. Passed to `createCart`
 * or the `add-line` mutation; the adapter expands it into a full
 * {@link CartLine} using catalog data from the provider.
 *
 * @example
 * ```ts
 * const line: NewCartLine = { variantId: 'gid://shopify/ProductVariant/1', quantity: 2 };
 * await kernel.mutate(ctx, { kind: 'add-line', ...line });
 * ```
 */
export type NewCartLine = {
    variantId: string;
    quantity: number;
    attributes?: Array<{ key: string; value: string }>;
};

/**
 * Denormalized product data captured at add-to-cart time and carried on the
 * `add-line` mutation. Allows UI layers to render optimistic line items before
 * the adapter round-trip completes, without a separate catalog fetch.
 *
 * @example
 * ```ts
 * const snapshot: ProductSnapshot = {
 *   variantId: variant.id,
 *   productHandle: product.handle,
 *   productTitle: product.title,
 *   variantTitle: variant.title,
 *   image: variant.image,
 *   unitPrice: variant.price,
 * };
 * await kernel.mutate(ctx, { kind: 'add-line', variantId: variant.id, quantity: 1, snapshot });
 * ```
 */
export type ProductSnapshot = {
    variantId: string;
    productHandle: string;
    productTitle: string;
    variantTitle: string;
    image: { url: string; altText: string | null; width: number; height: number } | null;
    unitPrice: Money;
    compareAtUnitPrice?: Money | null;
};

/**
 * Generic key-value pair used for cart attributes and line item attributes.
 * Adapters map these to provider-specific metadata fields.
 *
 * @example
 * ```ts
 * const attrs: KV[] = [{ key: 'gift_message', value: 'Happy birthday!' }];
 * await kernel.mutate(ctx, { kind: 'update-attributes', attributes: attrs });
 * ```
 */
export type KV = { key: string; value: string };

/**
 * Discriminated union of every operation the kernel can route to an adapter.
 * Pass to {@link CartKernel.mutate}; the kernel dispatches on `kind` to the
 * corresponding adapter method, guarded by {@link CartCapabilities}.
 *
 * @example
 * ```ts
 * const mutation: CartMutation = { kind: 'add-line', variantId: 'v_1', quantity: 2 };
 * await kernel.mutate(ctx, mutation);
 * ```
 */
export type CartMutation =
    | { kind: 'add-line'; variantId: string; quantity: number; attributes?: KV[]; snapshot?: ProductSnapshot }
    | { kind: 'update-line'; lineId: string; quantity: number }
    | { kind: 'remove-line'; lineId: string }
    | { kind: 'clear' }
    | { kind: 'apply-discount'; code: string }
    | { kind: 'remove-discount'; code: string }
    | { kind: 'apply-gift-card'; code: string }
    | { kind: 'remove-gift-card'; id: string }
    | { kind: 'update-note'; note: string }
    | { kind: 'update-attributes'; attributes: KV[] }
    | { kind: 'update-buyer-identity' }
    | { kind: 'custom'; name: string; payload: unknown };

/**
 * Wraps a {@link CartMutation} with an idempotency key for transport across
 * the server-action boundary. Used by {@link SubmitMutation} implementations
 * to carry the key alongside the mutation payload.
 *
 * @example
 * ```ts
 * const envelope: MutationEnvelope = {
 *   mutation: { kind: 'add-line', variantId: 'v_1', quantity: 1 },
 *   idempotencyKey: crypto.randomUUID(),
 * };
 * await submitMutation(envelope);
 * ```
 */
export type MutationEnvelope = { mutation: CartMutation; idempotencyKey: string };

/**
 * Machine-readable failure code surfaced on the `reason` field of a failing
 * {@link CartActionResult}. UI layers switch on this to decide whether to
 * show a retry button, a validation message, or a fallback redirect.
 *
 * @example
 * ```ts
 * if (!result.ok && result.reason === 'user-error') {
 *   showValidationErrors(result.userErrors ?? []);
 * }
 * ```
 */
export type CartActionFailureReason =
    | 'missing-shop'
    | 'missing-variant'
    | 'missing-line'
    | 'missing-cart'
    | 'invalid-quantity'
    | 'invalid-code'
    | 'unauthorized'
    | 'user-error'
    | 'network-error'
    | 'provider-error';

/**
 * Discriminated result returned by a {@link SubmitMutation} server action.
 * On success, `ok: true` carries the updated cart. On failure, `ok: false`
 * carries a {@link CartActionFailureReason} code, a human message, and
 * optional field-scoped `userErrors` for display.
 *
 * @example
 * ```ts
 * const result = await submitMutation(envelope);
 * if (result.ok) updateCart(result.cart);
 * else showError(result.reason, result.message);
 * ```
 */
export type CartActionResult<TExt extends CartExt = {}> =
    | { ok: true; cart: Cart<TExt> }
    | {
          ok: false;
          reason: CartActionFailureReason;
          message: string;
          userErrors?: Array<{ field?: string; message: string }>;
          cart?: Cart<TExt>;
      };

/**
 * Server-action signature that transport layers (Next.js, Remix, tRPC) implement
 * to accept a {@link MutationEnvelope} from the client and return a
 * {@link CartActionResult}. Wires the kernel into the framework's action
 * pipeline while keeping the kernel itself framework-agnostic.
 *
 * @example
 * ```ts
 * const submitMutation: SubmitMutation = async (envelope) => {
 *   const cart = await kernel.mutate({ ...ctx, idempotencyKey: envelope.idempotencyKey }, envelope.mutation);
 *   return { ok: true, cart };
 * };
 * ```
 */
export type SubmitMutation<TExt extends CartExt = {}> = (envelope: MutationEnvelope) => Promise<CartActionResult<TExt>>;

/**
 * Minimal structured-logging interface threaded through {@link AdapterCtx}.
 * Adapters and middleware log to this sink rather than `console` directly so
 * hosts can route output to their existing log pipeline.
 *
 * @example
 * ```ts
 * const ctx: AdapterCtx = { shop: {}, locale, logger: consoleLogger };
 * ctx.logger.info('cart created', { cartId: cart.id });
 * ```
 */
export interface ILogger {
    debug: (msg: string, meta?: Record<string, unknown>) => void;
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
}

/**
 * Default {@link ILogger} implementation that prefixes every message with
 * `[cart]` and writes to the platform `console`. Use as a drop-in when no
 * custom logger is provided to {@link createCart}.
 *
 * @example
 * ```ts
 * const kernel = createCart({ adapter, logger: consoleLogger });
 * ```
 */
export const consoleLogger: ILogger = {
    debug: (msg, meta) => console.debug(`[cart] ${msg}`, meta ?? ''),
    info: (msg, meta) => console.info(`[cart] ${msg}`, meta ?? ''),
    warn: (msg, meta) => console.warn(`[cart] ${msg}`, meta ?? ''),
    error: (msg, meta) => console.error(`[cart] ${msg}`, meta ?? ''),
};

/**
 * Minimal tracing interface accepted by the {@link tracing} middleware and
 * optionally supplied on {@link AdapterCtx}. Mirrors the OTel `Tracer` shape
 * without a direct dependency so hosts can bridge any tracing backend.
 *
 * @example
 * ```ts
 * const tracer: ITracer = {
 *   startSpan: async (name, attrs, fn) => {
 *     const span = openTelemetry.tracer.startSpan(name, { attributes: attrs });
 *     return fn({ recordException: (e) => span.recordException(e as Error), setAttribute: (k, v) => span.setAttribute(k, String(v)) });
 *   },
 * };
 * ```
 */
export interface ITracer {
    startSpan<R>(
        name: string,
        attrs: Record<string, unknown>,
        fn: (span: {
            recordException: (e: unknown) => void;
            setAttribute: (k: string, v: unknown) => void;
        }) => Promise<R>,
    ): Promise<R>;
}

/**
 * Immutable context threaded into every adapter call by the kernel. Carries
 * shop identity, locale, logger, and optional per-request signals so adapters
 * never reach for global state.
 *
 * @example
 * ```ts
 * const ctx: AdapterCtx = {
 *   shop: shopRecord,
 *   locale: { language: 'en', country: 'US', currency: 'USD' },
 *   logger: consoleLogger,
 *   idempotencyKey: crypto.randomUUID(),
 * };
 * ```
 */
export type AdapterCtx<TShop = unknown> = {
    shop: TShop;
    locale: LocaleTuple;
    /**
     * The cart that a mutation operates against. Required on mutations; absent
     * on reads (which pass `cartId` through their `args` instead). The kernel
     * reads this on dispatch to thread cartId into adapter calls.
     */
    cartId?: string;
    idempotencyKey?: string;
    signal?: AbortSignal;
    logger: ILogger;
    tracer?: ITracer;
};
