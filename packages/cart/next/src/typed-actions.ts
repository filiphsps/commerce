import type {
    AdapterCtx,
    BuyerIdentity,
    CartActionFailureReason,
    CartActionResult,
    CartExt,
    CartKernel,
    CartMutation,
    KV,
    MutationEnvelope,
    NewCartLine,
    ProductSnapshot,
} from '@nordcom/cart-core';
import { CartUserError } from '@nordcom/cart-core';

import type { CartIdStorage } from './storage';

export interface AuthBridge {
    /**
     * Resolves the buyer identity to merge onto `update-buyer-identity`
     * mutations. Hosts wire this to whatever auth session source they use
     * (NextAuth, custom JWT, Shopify customer access token).
     *
     * @returns The current {@link BuyerIdentity} or `null` when no buyer is
     *   signed in.
     */
    resolve(): Promise<BuyerIdentity | null>;
}

export interface CreateTypedCartActionsOpts<TExt extends CartExt, TShop> {
    kernel: CartKernel<TExt, TShop>;
    storage: CartIdStorage;
    resolveContext: (opts?: { idempotencyKey?: string }) => Promise<AdapterCtx<TShop>>;
    authBridge?: AuthBridge;
    messageLocalizer?: (reason: CartActionFailureReason, userErrorMessage?: string) => Promise<string>;
}

export interface TypedCartActions<TExt extends CartExt = {}> {
    addLine(
        args: NewCartLine & { snapshot?: ProductSnapshot; idempotencyKey: string },
    ): Promise<CartActionResult<TExt>>;
    updateLine(args: { lineId: string; quantity: number; idempotencyKey: string }): Promise<CartActionResult<TExt>>;
    removeLine(args: { lineId: string; idempotencyKey: string }): Promise<CartActionResult<TExt>>;
    applyDiscountCode(args: { code: string; idempotencyKey: string }): Promise<CartActionResult<TExt>>;
    removeDiscountCode(args: { code: string; idempotencyKey: string }): Promise<CartActionResult<TExt>>;
    applyGiftCard(args: { code: string; idempotencyKey: string }): Promise<CartActionResult<TExt>>;
    removeGiftCard(args: { id: string; idempotencyKey: string }): Promise<CartActionResult<TExt>>;
    updateNote(args: { note: string; idempotencyKey: string }): Promise<CartActionResult<TExt>>;
    updateAttributes(args: { attributes: KV[]; idempotencyKey: string }): Promise<CartActionResult<TExt>>;
    updateBuyerIdentity(args: { idempotencyKey: string }): Promise<CartActionResult<TExt>>;
    dispatch(envelope: MutationEnvelope): Promise<CartActionResult<TExt>>;
}

const englishFallback: Record<CartActionFailureReason, string> = {
    'missing-shop': 'Shop not available.',
    'missing-variant': 'Variant required.',
    'missing-line': 'Line required.',
    'missing-cart': 'Cart not found.',
    'invalid-quantity': 'Invalid quantity.',
    'invalid-code': 'Invalid code.',
    unauthorized: 'Not authorized.',
    'user-error': 'Cart action failed.',
    'network-error': 'Network error.',
    'provider-error': 'Provider error.',
};

/**
 * Routes a {@link CartActionFailureReason} through the host's
 * {@link CreateTypedCartActionsOpts.messageLocalizer} when present, or falls
 * back to the bundled English copy. The raw user-error message from the
 * provider is forwarded as the second argument so the localizer can choose
 * to surface it verbatim (e.g. Shopify validation strings).
 *
 * @param opts - Typed-action options carrying the optional localizer.
 * @param reason - The failure reason key driving lookup.
 * @param userErrorMessage - Raw provider message, if any.
 * @returns The localized (or fallback) human-readable message.
 */
async function localize<TExt extends CartExt, TShop>(
    opts: CreateTypedCartActionsOpts<TExt, TShop>,
    reason: CartActionFailureReason,
    userErrorMessage?: string,
): Promise<string> {
    if (opts.messageLocalizer) return opts.messageLocalizer(reason, userErrorMessage);
    return userErrorMessage ?? englishFallback[reason];
}

/**
 * Translates a thrown error from `kernel.mutate` into the
 * {@link CartActionResult} discriminated union. Matches by `.name` so the
 * error class still works when it crosses bundle boundaries (host code may
 * have its own copy of cart-core).
 *
 * @param opts - Typed-action options for localization.
 * @param error - Caught value from the kernel chain.
 * @returns A failure-shaped {@link CartActionResult}.
 */
async function mapError<TExt extends CartExt, TShop>(
    opts: CreateTypedCartActionsOpts<TExt, TShop>,
    error: unknown,
): Promise<CartActionResult<TExt>> {
    const name = (error as { name?: string } | null)?.name;
    if (name === 'CartUserError') {
        const userErrors =
            error instanceof CartUserError
                ? error.userErrors
                : ((error as { userErrors?: Array<{ field?: string; message: string }> }).userErrors ?? []);
        const firstMessage = userErrors[0]?.message;
        return {
            ok: false,
            reason: 'user-error',
            userErrors,
            message: await localize(opts, 'user-error', firstMessage),
        };
    }
    if (name === 'CartNotFoundError') {
        return {
            ok: false,
            reason: 'missing-cart',
            message: await localize(opts, 'missing-cart'),
        };
    }
    return {
        ok: false,
        reason: 'provider-error',
        message: await localize(opts, 'provider-error'),
    };
}

/**
 * Returns a cart id, creating a fresh cart through the kernel and persisting
 * it via storage if nothing is stored yet. Subsequent mutations all run
 * against the same persisted id within a request.
 *
 * @param opts - Typed-action options (kernel + storage).
 * @param ctx - Adapter context for the kernel call.
 * @returns The active cart id.
 */
async function ensureCartId<TExt extends CartExt, TShop>(
    opts: CreateTypedCartActionsOpts<TExt, TShop>,
    ctx: AdapterCtx<TShop>,
): Promise<string> {
    const stored = await opts.storage.get();
    if (stored) return stored;
    const cart = await opts.kernel.create(ctx, {});
    await opts.storage.set(cart.id);
    return cart.id;
}

/**
 * Threads a typed mutation through `resolveContext` → `ensureCartId` →
 * `kernel.mutate`, converting any thrown error into the
 * {@link CartActionResult} failure shape. Idempotency keys travel through the
 * resolved {@link AdapterCtx} so the kernel's idempotency middleware can
 * dedup concurrent retries; the cart id is attached to the mutation as an
 * extra property because the kernel reads `mutation.cartId` to route per-cart
 * adapter calls.
 *
 * @param opts - Typed-action factory options.
 * @param mutation - The {@link CartMutation} to apply.
 * @param idempotencyKey - Per-invocation key threaded into context.
 * @returns Discriminated success/failure result for the action.
 */
async function run<TExt extends CartExt, TShop>(
    opts: CreateTypedCartActionsOpts<TExt, TShop>,
    mutation: CartMutation,
    idempotencyKey: string,
): Promise<CartActionResult<TExt>> {
    const ctx = await opts.resolveContext({ idempotencyKey });
    try {
        const cartId = await ensureCartId(opts, ctx);
        const cart = await opts.kernel.mutate(ctx, { ...mutation, cartId } as unknown as CartMutation);
        return { ok: true, cart };
    } catch (error) {
        return mapError(opts, error);
    }
}

/**
 * Builds the typed, JSON-arg server-action surface for cart-next hosts.
 * Each returned method threads the supplied `idempotencyKey` into
 * {@link AdapterCtx} via `resolveContext({ idempotencyKey })` and routes the
 * call through the kernel — so middleware (logger, tracing, idempotency,
 * retry, analytics) runs on every action just as it would for a direct
 * `kernel.mutate` call.
 *
 * Error mapping is centralised here: anything thrown becomes a typed
 * `CartActionResult` with a localized message, instead of bubbling raw
 * provider exceptions across the server-action boundary.
 *
 * @param opts.kernel - The cart kernel to dispatch through.
 * @param opts.storage - Storage used to lazily create + persist a cart id.
 * @param opts.resolveContext - Host-supplied function returning the
 *   {@link AdapterCtx} for the current request. Must accept an optional
 *   idempotency key and place it on the returned context.
 * @param opts.authBridge - Optional bridge resolving the active buyer for
 *   `update-buyer-identity` mutations.
 * @param opts.messageLocalizer - Optional message localizer used to translate
 *   failure reasons + provider messages for the current locale.
 * @returns A {@link TypedCartActions} surface ready to bind as `"use server"`
 *   re-exports.
 */
export function createTypedCartActions<TExt extends CartExt = {}, TShop = unknown>(
    opts: CreateTypedCartActionsOpts<TExt, TShop>,
): TypedCartActions<TExt> {
    return {
        addLine: (args) =>
            run(
                opts,
                {
                    kind: 'add-line',
                    variantId: args.variantId,
                    quantity: args.quantity,
                    attributes: args.attributes,
                    snapshot: args.snapshot,
                },
                args.idempotencyKey,
            ),
        updateLine: (args) =>
            run(opts, { kind: 'update-line', lineId: args.lineId, quantity: args.quantity }, args.idempotencyKey),
        removeLine: (args) => run(opts, { kind: 'remove-line', lineId: args.lineId }, args.idempotencyKey),
        applyDiscountCode: (args) => run(opts, { kind: 'apply-discount', code: args.code }, args.idempotencyKey),
        removeDiscountCode: (args) => run(opts, { kind: 'remove-discount', code: args.code }, args.idempotencyKey),
        applyGiftCard: (args) => run(opts, { kind: 'apply-gift-card', code: args.code }, args.idempotencyKey),
        removeGiftCard: (args) => run(opts, { kind: 'remove-gift-card', id: args.id }, args.idempotencyKey),
        updateNote: (args) => run(opts, { kind: 'update-note', note: args.note }, args.idempotencyKey),
        updateAttributes: (args) =>
            run(opts, { kind: 'update-attributes', attributes: args.attributes }, args.idempotencyKey),
        updateBuyerIdentity: (args) => run(opts, { kind: 'update-buyer-identity' }, args.idempotencyKey),
        dispatch: (envelope) => run(opts, envelope.mutation, envelope.idempotencyKey),
    };
}
