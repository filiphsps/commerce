import type { CartAdapter, CartCapabilities, CustomMutationHandler } from './adapter';
import { CartNotFoundError } from './errors';
import type { Cart, CartLine, CartMutation, NewCartLine } from './types';

const DEFAULT_CAPS: CartCapabilities = {
    giftCards: true,
    multipleDiscountCodes: true,
    buyerIdentity: true,
    notes: true,
    cartAttributes: true,
    lineAttributes: true,
    customMutations: [],
};

let nextCartSerial = 1;
let nextLineSerial = 1;

/**
 * Builds an empty in-memory cart shell with platform defaults and a unique
 * serial id. Used as the starting point for {@link createCart}.
 *
 * @param currencyCode - Currency stamped on the cart's zero-amount subtotal.
 * @returns A fresh {@link Cart} with no lines.
 */
function emptyCart(currencyCode: string): Cart {
    return {
        id: `mock-cart-${nextCartSerial++}`,
        providerType: 'mock',
        totalQuantity: 0,
        checkoutUrl: null,
        lines: [],
        cost: { subtotal: { amount: '0', currencyCode }, total: null, tax: null, shipping: null },
        costStale: false,
        discountCodes: [],
        giftCards: [],
        buyerIdentity: null,
        note: null,
        attributes: [],
        updatedAt: new Date().toISOString(),
        custom: {},
    };
}

/**
 * Builds a synthetic {@link CartLine} from a {@link NewCartLine}. Prices are
 * zeroed because the mock has no catalog — tests that need realistic costs
 * should patch lines after creation.
 *
 * @param newLine - Caller-supplied line spec from `addLines` / `createCart`.
 * @param currencyCode - Currency stamped on the line's zero-amount prices.
 * @returns A populated {@link CartLine} with a fresh mock id.
 */
function synthesizeLine(newLine: NewCartLine, currencyCode: string): CartLine {
    return {
        id: `mock-line-${nextLineSerial++}`,
        quantity: newLine.quantity,
        merchandise: {
            id: newLine.variantId,
            productId: 'mock-product',
            productHandle: 'mock',
            productTitle: 'Mock product',
            productVendor: null,
            productType: null,
            variantTitle: 'Mock variant',
            image: null,
            selectedOptions: [],
            unitPrice: { amount: '0', currencyCode },
            compareAtUnitPrice: null,
            availableForSale: true,
            quantityAvailable: null,
            sku: null,
        },
        cost: { subtotal: { amount: '0', currencyCode }, total: { amount: '0', currencyCode } },
        attributes: newLine.attributes ?? [],
        discountAllocations: [],
        custom: {},
    };
}

/**
 * Returns a copy of `cart` with `totalQuantity` re-derived from its lines and
 * `updatedAt` stamped to now. Centralised so every mutation produces a
 * consistent snapshot.
 *
 * @param cart - Cart to recompute.
 * @returns A new cart object with refreshed `totalQuantity` + `updatedAt`.
 */
function recomputeTotalQuantity(cart: Cart): Cart {
    return {
        ...cart,
        totalQuantity: cart.lines.reduce((sum, l) => sum + l.quantity, 0),
        updatedAt: new Date().toISOString(),
    };
}

/**
 * Options for {@link createMockCartAdapter}. All fields are optional; omitting
 * them yields an everything-enabled adapter with zero latency and no injected
 * failures.
 *
 * @example
 * ```ts
 * const opts: CreateMockCartAdapterOpts = {
 *   capabilities: { giftCards: false },
 *   latency: 50,
 * };
 * const adapter = createMockCartAdapter(opts);
 * ```
 */
export interface CreateMockCartAdapterOpts {
    capabilities?: Partial<CartCapabilities>;
    seedCarts?: Cart[];
    latency?: number;
    failOn?: (m: CartMutation) => Error | null;
    customMutations?: Record<string, CustomMutationHandler>;
}

/**
 * Builds an in-memory cart adapter for host tests and contract self-tests.
 * State lives in a `Map` scoped to the returned instance, so each call is
 * isolated. Capability overrides flip optional adapter methods on or off so
 * tests can assert kernel capability-gating without a real provider.
 *
 * @param opts.capabilities - Partial override of {@link CartCapabilities};
 *   merged onto the everything-enabled default.
 * @param opts.seedCarts - Pre-populate the internal map with carts the test
 *   can `getCart` immediately.
 * @param opts.latency - Optional delay (ms) before each mutation resolves;
 *   used for race-condition + timing tests.
 * @param opts.failOn - Predicate invoked before each mutation; if it returns
 *   an error the adapter throws it instead of mutating.
 * @param opts.customMutations - Named custom-mutation handlers wired onto
 *   `adapter.customMutations`.
 * @returns A {@link CartAdapter} with an extra `__inspect()` escape hatch.
 * @example
 * ```ts
 * const adapter = createMockCartAdapter({ latency: 0 });
 * const kernel = createCart({ adapter });
 * const cart = await kernel.create(ctx);
 * expect(adapter.__inspect().carts).toHaveLength(1);
 * ```
 */
export function createMockCartAdapter(
    opts: CreateMockCartAdapterOpts = {},
): CartAdapter & { __inspect(): { carts: Cart[] } } {
    const caps: CartCapabilities = { ...DEFAULT_CAPS, ...opts.capabilities };
    const carts = new Map<string, Cart>();
    for (const c of opts.seedCarts ?? []) carts.set(c.id, c);

    const wait = async (): Promise<void> => {
        if (opts.latency && opts.latency > 0) {
            await new Promise((resolve) => setTimeout(resolve, opts.latency));
        }
    };

    const failGate = (m: CartMutation): void => {
        const err = opts.failOn?.(m);
        if (err) throw err;
    };

    const requireCart = (cartId: string): Cart => {
        const cart = carts.get(cartId);
        if (!cart) throw new CartNotFoundError(cartId);
        return cart;
    };

    const adapter: CartAdapter & { __inspect(): { carts: Cart[] } } = {
        type: 'mock',
        capabilities: caps,
        async getCart(_ctx, args) {
            await wait();
            return carts.get(args.cartId) ?? null;
        },
        async createCart(ctx, args) {
            await wait();
            const cart = emptyCart(ctx.locale.currency);
            if (args.lines) {
                cart.lines = args.lines.map((l) => synthesizeLine(l, ctx.locale.currency));
            }
            if (args.buyerIdentity) cart.buyerIdentity = args.buyerIdentity;
            const finalized = recomputeTotalQuantity(cart);
            carts.set(finalized.id, finalized);
            return finalized;
        },
        async addLines(ctx, args) {
            const [firstLine] = args.lines;
            if (firstLine) {
                failGate({
                    kind: 'add-line',
                    variantId: firstLine.variantId,
                    quantity: firstLine.quantity,
                });
            }
            await wait();
            const cart = requireCart(args.cartId);
            const updated = recomputeTotalQuantity({
                ...cart,
                lines: [...cart.lines, ...args.lines.map((l) => synthesizeLine(l, ctx.locale.currency))],
            });
            carts.set(updated.id, updated);
            return updated;
        },
        async updateLines(_ctx, args) {
            const [firstUpdate] = args.lines;
            if (firstUpdate) {
                failGate({
                    kind: 'update-line',
                    lineId: firstUpdate.id,
                    quantity: firstUpdate.quantity,
                });
            }
            await wait();
            const cart = requireCart(args.cartId);
            const next = {
                ...cart,
                lines: cart.lines
                    .map((l) => {
                        const u = args.lines.find((x) => x.id === l.id);
                        return u ? { ...l, quantity: u.quantity } : l;
                    })
                    .filter((l) => l.quantity > 0),
            };
            const finalized = recomputeTotalQuantity(next);
            carts.set(finalized.id, finalized);
            return finalized;
        },
        async removeLines(_ctx, args) {
            const [firstLineId] = args.lineIds;
            if (firstLineId !== undefined) {
                failGate({ kind: 'remove-line', lineId: firstLineId });
            }
            await wait();
            const cart = requireCart(args.cartId);
            const finalized = recomputeTotalQuantity({
                ...cart,
                lines: cart.lines.filter((l) => !args.lineIds.includes(l.id)),
            });
            carts.set(finalized.id, finalized);
            return finalized;
        },
        __inspect() {
            return { carts: [...carts.values()] };
        },
    };

    if (caps.giftCards) {
        adapter.applyGiftCardCodes = async (_ctx, args) => {
            const cart = requireCart(args.cartId);
            const finalized = {
                ...cart,
                giftCards: [
                    ...cart.giftCards,
                    ...args.codes.map((c) => ({
                        id: c,
                        lastCharacters: c.slice(-4),
                        amountLeft: { amount: '0', currencyCode: cart.cost.subtotal.currencyCode },
                    })),
                ],
            };
            carts.set(finalized.id, finalized);
            return finalized;
        };
        adapter.removeGiftCardCodes = async (_ctx, args) => {
            const cart = requireCart(args.cartId);
            const finalized = {
                ...cart,
                giftCards: cart.giftCards.filter((g) => !args.ids.includes(g.id)),
            };
            carts.set(finalized.id, finalized);
            return finalized;
        };
    }
    if (caps.multipleDiscountCodes) {
        adapter.applyDiscountCodes = async (_ctx, args) => {
            const cart = requireCart(args.cartId);
            const finalized = {
                ...cart,
                discountCodes: args.codes.map((c) => ({ code: c, applicable: true })),
            };
            carts.set(finalized.id, finalized);
            return finalized;
        };
    }
    if (caps.buyerIdentity) {
        adapter.updateBuyerIdentity = async (_ctx, args) => {
            const cart = requireCart(args.cartId);
            const finalized = { ...cart, buyerIdentity: args.buyerIdentity };
            carts.set(finalized.id, finalized);
            return finalized;
        };
    }
    if (caps.notes) {
        adapter.updateNote = async (_ctx, args) => {
            const cart = requireCart(args.cartId);
            const finalized = { ...cart, note: args.note };
            carts.set(finalized.id, finalized);
            return finalized;
        };
    }
    if (caps.cartAttributes) {
        adapter.updateAttributes = async (_ctx, args) => {
            const cart = requireCart(args.cartId);
            const finalized = { ...cart, attributes: args.attributes };
            carts.set(finalized.id, finalized);
            return finalized;
        };
    }
    if (opts.customMutations) adapter.customMutations = opts.customMutations;

    return adapter;
}
