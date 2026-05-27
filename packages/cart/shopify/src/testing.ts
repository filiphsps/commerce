import type { ShopifyTransport } from './transport';

interface InternalLine {
    id: string;
    merchandiseId: string;
    quantity: number;
}

interface InternalCart {
    id: string;
    lines: InternalLine[];
    discountCodes: string[];
    giftCardIds: string[];
    buyerIdentity: Record<string, unknown> | null;
    note: string | null;
    attributes: Array<{ key: string; value: string }>;
    updatedAt: string;
}

/**
 * Initialises a blank internal cart bucket. Kept private so the mock controls
 * the canonical empty shape — tests that need pre-populated state should drive
 * mutations rather than mutate raw internals.
 *
 * @param id - Shopify-style cart identifier the test will see.
 * @returns Empty internal cart bucket.
 */
function emptyCart(id: string): InternalCart {
    return {
        id,
        lines: [],
        discountCodes: [],
        giftCardIds: [],
        buyerIdentity: null,
        note: null,
        attributes: [],
        updatedAt: new Date().toISOString(),
    };
}

/**
 * Stamps the cart with a fresh `updatedAt` timestamp; called by every mutation
 * branch so read-after-write returns the same snapshot the writer produced.
 * Read-only queries (`getCart`) deliberately reuse the stored timestamp so
 * `createCart` + `getCart` round-trips match exactly.
 *
 * @param c - Internal cart bucket; mutated in place.
 */
function touch(c: InternalCart): void {
    c.updatedAt = new Date().toISOString();
}

/**
 * Renders an internal cart into the on-the-wire Shopify cart shape the
 * normalizer expects. Only the fields the cart-core contract suite reads back
 * are populated; everything else uses defensible zero defaults so the
 * normalizer's fallback paths stay covered.
 *
 * @param c - Internal cart bucket.
 * @returns Object structurally compatible with `normalize`'s `ShopifyCart`.
 */
function toShopifyCart(c: InternalCart): unknown {
    return {
        id: c.id,
        totalQuantity: c.lines.reduce((s, l) => s + l.quantity, 0),
        checkoutUrl: `https://mock.shop/checkout/${c.id}`,
        lines: {
            edges: c.lines.map((l) => ({
                node: {
                    id: l.id,
                    quantity: l.quantity,
                    merchandise: {
                        __typename: 'ProductVariant',
                        id: l.merchandiseId,
                        title: 'Mock',
                        image: null,
                        selectedOptions: [],
                        price: { amount: '0.00', currencyCode: 'USD' },
                        compareAtPrice: null,
                        availableForSale: true,
                        quantityAvailable: null,
                        sku: null,
                        product: {
                            id: 'p',
                            handle: 'mock',
                            title: 'Mock',
                            vendor: null,
                            productType: null,
                        },
                    },
                    cost: {
                        subtotalAmount: { amount: '0.00', currencyCode: 'USD' },
                        totalAmount: { amount: '0.00', currencyCode: 'USD' },
                    },
                    attributes: [],
                    discountAllocations: [],
                },
            })),
        },
        cost: {
            subtotalAmount: { amount: '0.00', currencyCode: 'USD' },
            totalAmount: { amount: '0.00', currencyCode: 'USD' },
            totalTaxAmount: null,
            totalDutyAmount: null,
        },
        discountCodes: c.discountCodes.map((code) => ({ code, applicable: true })),
        appliedGiftCards: c.giftCardIds.map((id) => ({
            id,
            lastCharacters: id.slice(-4),
            amountUsed: { amount: '0.00', currencyCode: 'USD' },
        })),
        buyerIdentity: c.buyerIdentity,
        note: c.note,
        attributes: c.attributes,
        updatedAt: c.updatedAt,
    };
}

/**
 * Options for {@link mockShopifyTransport}. `failOn` lets test authors inject
 * transport-level failures on specific Shopify mutation operations so the
 * adapter's error-handling paths can be exercised without a live endpoint.
 *
 * @example
 * ```ts
 * const transport = mockShopifyTransport({
 *     failOn: (op) => op === 'cartLinesAdd' ? new Error('network error') : null,
 * });
 * ```
 */
export interface MockShopifyTransportOpts {
    failOn?: (op: string, vars: Record<string, unknown>) => Error | null;
}

/**
 * Inspects a mutation's variables to infer which Shopify cart mutation the
 * adapter just dispatched. The real Storefront API tells you via the document
 * AST; the mock relies on key shape because gql.tada compiles documents to
 * opaque objects. Good enough for the contract suite and host integration
 * tests — not a wire-faithful Shopify emulator.
 *
 * @param vars - Variables payload the adapter sent.
 * @returns Mutation name matching `data.<name>` in the response envelope.
 * @throws Error when no shape rule matches; surfaces as a test-time failure
 *   with the offending vars in the message for fast diagnosis.
 */
function pickMutationOp(vars: Record<string, unknown>): string {
    if (vars.input !== undefined) return 'cartCreate';
    if (vars.lineIds !== undefined) return 'cartLinesRemove';
    if (vars.discountCodes !== undefined) return 'cartDiscountCodesUpdate';
    if (vars.giftCardCodes !== undefined) return 'cartGiftCardCodesUpdate';
    if (vars.appliedGiftCardIds !== undefined) return 'cartGiftCardCodesRemove';
    if (vars.buyerIdentity !== undefined) return 'cartBuyerIdentityUpdate';
    if (vars.note !== undefined) return 'cartNoteUpdate';
    if (vars.attributes !== undefined) return 'cartAttributesUpdate';
    if (vars.lines !== undefined && vars.cartId !== undefined) {
        const lines = vars.lines as Array<Record<string, unknown>>;
        const [first] = lines;
        if (first && 'merchandiseId' in first) return 'cartLinesAdd';
        return 'cartLinesUpdate';
    }
    throw new Error(`mockShopifyTransport: cannot infer mutation from vars ${JSON.stringify(vars)}`);
}

/**
 * Builds an in-memory `ShopifyTransport` that responds with the same envelope
 * shape the real Storefront API would produce. Lets cart-core's contract
 * suite (and host integration tests) drive `createShopifyCartAdapter` without
 * a real Shopify endpoint.
 *
 * @param opts.failOn - Predicate invoked with `(op, vars)` before each
 *   mutation. Returning an `Error` causes the transport to throw it instead
 *   of mutating — used to force adapter error-handling paths.
 * @returns Stateful transport whose `Map` is scoped per call, so concurrent
 *   tests don't share state.
 */
export function mockShopifyTransport(opts: MockShopifyTransportOpts = {}): ShopifyTransport {
    const carts = new Map<string, InternalCart>();
    let nextLineSerial = 1;

    const getCart = (id: string): InternalCart => {
        const c = carts.get(id);
        if (!c) throw Object.assign(new Error(`Cart not found: ${id}`), { name: 'CartNotFoundError' });
        return c;
    };

    const envelope = (op: string, vars: Record<string, unknown>, fn: () => unknown): { data: unknown } => {
        const err = opts.failOn?.(op, vars);
        if (err) throw err;
        return { data: fn() };
    };

    return {
        async query<T = unknown>(_doc: unknown, vars: Record<string, unknown>): Promise<{ data: T | null }> {
            return envelope('query', vars, () => {
                const id = vars.cartId as string;
                const c = carts.get(id);
                return c ? { cart: toShopifyCart(c) } : { cart: null };
            }) as { data: T | null };
        },
        async mutate<T = unknown>(_doc: unknown, vars: Record<string, unknown>): Promise<{ data: T | null }> {
            const op = pickMutationOp(vars);
            return envelope(op, vars, () => {
                switch (op) {
                    case 'cartCreate': {
                        const id = `gid://shopify/Cart/mock-${carts.size + 1}`;
                        const c = emptyCart(id);
                        const input = vars.input as
                            | {
                                  lines?: Array<{ merchandiseId: string; quantity: number }>;
                                  buyerIdentity?: Record<string, unknown>;
                                  attributes?: Array<{ key: string; value: string }>;
                              }
                            | undefined;
                        if (input?.lines) {
                            for (const l of input.lines) {
                                c.lines.push({
                                    id: `gid://shopify/CartLine/${nextLineSerial++}`,
                                    merchandiseId: l.merchandiseId,
                                    quantity: l.quantity,
                                });
                            }
                        }
                        if (input?.buyerIdentity) c.buyerIdentity = input.buyerIdentity;
                        if (input?.attributes) c.attributes = input.attributes;
                        touch(c);
                        carts.set(id, c);
                        return { cartCreate: { cart: toShopifyCart(c), userErrors: [] } };
                    }
                    case 'cartLinesAdd': {
                        const c = getCart(vars.cartId as string);
                        for (const l of vars.lines as Array<{ merchandiseId: string; quantity: number }>) {
                            c.lines.push({
                                id: `gid://shopify/CartLine/${nextLineSerial++}`,
                                merchandiseId: l.merchandiseId,
                                quantity: l.quantity,
                            });
                        }
                        touch(c);
                        return { cartLinesAdd: { cart: toShopifyCart(c), userErrors: [] } };
                    }
                    case 'cartLinesUpdate': {
                        const c = getCart(vars.cartId as string);
                        const updates = vars.lines as Array<{ id: string; quantity: number }>;
                        c.lines = c.lines
                            .map((l) => {
                                const u = updates.find((x) => x.id === l.id);
                                return u ? { ...l, quantity: u.quantity } : l;
                            })
                            .filter((l) => l.quantity > 0);
                        touch(c);
                        return { cartLinesUpdate: { cart: toShopifyCart(c), userErrors: [] } };
                    }
                    case 'cartLinesRemove': {
                        const c = getCart(vars.cartId as string);
                        const ids = vars.lineIds as string[];
                        c.lines = c.lines.filter((l) => !ids.includes(l.id));
                        touch(c);
                        return { cartLinesRemove: { cart: toShopifyCart(c), userErrors: [] } };
                    }
                    case 'cartDiscountCodesUpdate': {
                        const c = getCart(vars.cartId as string);
                        c.discountCodes = vars.discountCodes as string[];
                        touch(c);
                        return { cartDiscountCodesUpdate: { cart: toShopifyCart(c), userErrors: [] } };
                    }
                    case 'cartGiftCardCodesUpdate': {
                        const c = getCart(vars.cartId as string);
                        c.giftCardIds.push(...(vars.giftCardCodes as string[]));
                        touch(c);
                        return { cartGiftCardCodesUpdate: { cart: toShopifyCart(c), userErrors: [] } };
                    }
                    case 'cartGiftCardCodesRemove': {
                        const c = getCart(vars.cartId as string);
                        const ids = vars.appliedGiftCardIds as string[];
                        c.giftCardIds = c.giftCardIds.filter((id) => !ids.includes(id));
                        touch(c);
                        return { cartGiftCardCodesRemove: { cart: toShopifyCart(c), userErrors: [] } };
                    }
                    case 'cartBuyerIdentityUpdate': {
                        const c = getCart(vars.cartId as string);
                        c.buyerIdentity = vars.buyerIdentity as Record<string, unknown>;
                        touch(c);
                        return { cartBuyerIdentityUpdate: { cart: toShopifyCart(c), userErrors: [] } };
                    }
                    case 'cartNoteUpdate': {
                        const c = getCart(vars.cartId as string);
                        c.note = vars.note as string;
                        touch(c);
                        return { cartNoteUpdate: { cart: toShopifyCart(c), userErrors: [] } };
                    }
                    case 'cartAttributesUpdate': {
                        const c = getCart(vars.cartId as string);
                        c.attributes = vars.attributes as Array<{ key: string; value: string }>;
                        touch(c);
                        return { cartAttributesUpdate: { cart: toShopifyCart(c), userErrors: [] } };
                    }
                    default:
                        throw new Error(
                            `mockShopifyTransport: unhandled mutation op '${op}' with vars ${JSON.stringify(vars)}`,
                        );
                }
            }) as { data: T | null };
        },
    };
}
