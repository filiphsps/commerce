import type { Cart, CartLine, CartLineMerchandise, Money } from '@nordcom/cart-core';

type ShopifyMoney = { amount: string; currencyCode: string };

type ShopifyImage = {
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
};

type ShopifyMerchandise = {
    id: string;
    title?: string | null;
    sku?: string | null;
    availableForSale?: boolean | null;
    quantityAvailable?: number | null;
    selectedOptions?: Array<{ name: string; value: string }> | null;
    price?: ShopifyMoney | null;
    compareAtPrice?: ShopifyMoney | null;
    image?: ShopifyImage | null;
    product?: {
        id?: string | null;
        handle?: string | null;
        title?: string | null;
        vendor?: string | null;
        productType?: string | null;
    } | null;
};

type ShopifyDiscountAllocation = {
    discountedAmount?: ShopifyMoney | null;
    title?: string;
    code?: string;
};

type ShopifyLineEdge = {
    node: {
        id: string;
        quantity: number;
        merchandise: ShopifyMerchandise;
        cost?: {
            subtotalAmount?: ShopifyMoney | null;
            totalAmount?: ShopifyMoney | null;
        } | null;
        attributes?: Array<{ key: string; value: string }> | null;
        discountAllocations?: ShopifyDiscountAllocation[] | null;
    };
};

type ShopifyDiscountCode = { code: string; applicable: boolean };

type ShopifyGiftCard = {
    id: string;
    lastCharacters: string;
    balance?: ShopifyMoney | null;
};

type ShopifyBuyerIdentity = {
    email?: string | null;
    phone?: string | null;
    countryCode?: string | null;
};

type ShopifyCart = {
    id: string;
    checkoutUrl?: string | null;
    totalQuantity?: number | null;
    updatedAt: string;
    note?: string | null;
    attributes?: Array<{ key: string; value: string }> | null;
    cost?: {
        subtotalAmount?: ShopifyMoney | null;
        totalAmount?: ShopifyMoney | null;
    } | null;
    lines?: { edges?: ShopifyLineEdge[] | null } | null;
    discountCodes?: ShopifyDiscountCode[] | null;
    appliedGiftCards?: ShopifyGiftCard[] | null;
    buyerIdentity?: ShopifyBuyerIdentity | null;
};

/**
 * Coerces Shopify's optional money envelope into the strict `Money | null`
 * cart-core uses. Returning `null` (vs. zero) preserves provenance so callers
 * can distinguish "field omitted by upstream" from "field is genuinely zero".
 *
 * @param m - Raw Shopify money payload, possibly absent.
 * @returns Cart-core money or `null` when input is missing.
 */
const money = (m: ShopifyMoney | null | undefined): Money | null => {
    if (!m) return null;
    return { amount: m.amount, currencyCode: m.currencyCode };
};

/**
 * Like {@link money} but substitutes a caller-supplied fallback when the
 * Shopify field is absent. Used for required cart-core fields (line subtotals,
 * gift-card balances) where `null` is not a valid shape.
 *
 * @param m - Raw Shopify money payload, possibly absent.
 * @param fallback - Replacement returned when `m` is missing.
 * @returns Cart-core money, never `null`.
 */
const moneyOr = (m: ShopifyMoney | null | undefined, fallback: Money): Money => {
    return money(m) ?? fallback;
};

/**
 * Builds a zero-valued money object in the requested currency for use as a
 * fallback when Shopify omits a money field on a non-nullable cart-core slot.
 *
 * @param currencyCode - ISO 4217 currency to stamp on the zero amount.
 * @returns Zero-amount money in the supplied currency.
 */
const ZERO_MONEY = (currencyCode: string): Money => ({ amount: '0', currencyCode });

/**
 * Maps Shopify's `ProductVariant`-shaped merchandise payload onto cart-core's
 * `CartLineMerchandise`. Falls back to safe defaults (empty title, true
 * availability, zero unit price) when upstream omits optional fields.
 *
 * @param merch - Raw Shopify merchandise node from `lines.edges[].node.merchandise`.
 * @param currencyCode - Currency used for the zero-price fallback when
 *   Shopify returns no `price` (rare; defensive only).
 * @returns Cart-core merchandise snapshot.
 */
function normalizeMerchandise(merch: ShopifyMerchandise, currencyCode: string): CartLineMerchandise {
    return {
        id: merch.id,
        productId: merch.product?.id ?? '',
        productHandle: merch.product?.handle ?? '',
        productTitle: merch.product?.title ?? '',
        productVendor: merch.product?.vendor ?? null,
        productType: merch.product?.productType ?? null,
        variantTitle: merch.title ?? '',
        image: merch.image
            ? {
                  url: merch.image.url,
                  altText: merch.image.altText ?? null,
                  width: merch.image.width ?? 0,
                  height: merch.image.height ?? 0,
              }
            : null,
        selectedOptions: merch.selectedOptions ?? [],
        unitPrice: moneyOr(merch.price, ZERO_MONEY(currencyCode)),
        compareAtUnitPrice: money(merch.compareAtPrice),
        availableForSale: merch.availableForSale ?? true,
        quantityAvailable: merch.quantityAvailable ?? null,
        sku: merch.sku ?? null,
    };
}

/**
 * Maps a single Shopify line edge onto cart-core's `CartLine`. The `custom`
 * extension slot is left as an empty object so default `CartExt['line']`
 * (`unknown`) is satisfied; host extensions are layered on by the host
 * adapter, not here.
 *
 * @param edge - Raw `lines.edges[]` element from the Shopify cart payload.
 * @param currencyCode - Currency used for the zero-price fallback when a
 *   line's cost envelope is absent.
 * @returns Normalised cart line.
 */
function normalizeLine(edge: ShopifyLineEdge, currencyCode: string): CartLine {
    const node = edge.node;
    const m = node.merchandise;
    return {
        id: node.id,
        quantity: node.quantity,
        merchandise: normalizeMerchandise(m, currencyCode),
        cost: {
            subtotal: moneyOr(node.cost?.subtotalAmount, ZERO_MONEY(currencyCode)),
            total: moneyOr(node.cost?.totalAmount, ZERO_MONEY(currencyCode)),
        },
        attributes: node.attributes ?? [],
        discountAllocations: (node.discountAllocations ?? []).map((d) => ({
            discountedAmount: moneyOr(d.discountedAmount, ZERO_MONEY(currencyCode)),
            title: d.title,
            code: d.code,
        })),
        custom: {},
    };
}

/**
 * Normalises a raw Shopify Storefront `Cart` payload into cart-core's
 * provider-agnostic `Cart`. Returns `null` for falsy input so callers can use
 * the same function for both `cart` query results and post-mutation envelopes.
 *
 * Shopify's deprecated `totalTaxAmount` / `totalDutyAmount` fields are mapped
 * to `null` because cart-core treats taxes + shipping as host-computed.
 * Buyer-identity provider data (e.g. customer access tokens) is intentionally
 * dropped: the new `BuyerIdentity.provider` shape is supplied by the host
 * auth bridge, not echoed back from Shopify.
 *
 * @param raw - The Shopify cart envelope (typed as `unknown` because gql.tada
 *   inferred types vary by selection set).
 * @returns Normalised cart, or `null` when `raw` is `null` / `undefined`.
 */
export function normalize(raw: unknown): Cart | null {
    if (!raw) return null;
    const input = raw as ShopifyCart;
    const currencyCode = input.cost?.subtotalAmount?.currencyCode ?? 'USD';
    const subtotal = moneyOr(input.cost?.subtotalAmount, ZERO_MONEY(currencyCode));
    const lines: CartLine[] = (input.lines?.edges ?? []).map((edge) => normalizeLine(edge, currencyCode));
    return {
        id: input.id,
        providerType: 'shopify',
        totalQuantity: input.totalQuantity ?? 0,
        checkoutUrl: input.checkoutUrl ?? null,
        lines,
        cost: {
            subtotal,
            total: money(input.cost?.totalAmount),
            tax: null,
            shipping: null,
        },
        costStale: false,
        discountCodes: (input.discountCodes ?? []).map((d) => ({
            code: d.code,
            applicable: d.applicable,
        })),
        giftCards: (input.appliedGiftCards ?? []).map((g) => ({
            id: g.id,
            lastCharacters: g.lastCharacters,
            amountLeft: moneyOr(g.balance, ZERO_MONEY(currencyCode)),
        })),
        buyerIdentity: input.buyerIdentity
            ? {
                  email: input.buyerIdentity.email ?? undefined,
                  phone: input.buyerIdentity.phone ?? undefined,
                  countryCode: input.buyerIdentity.countryCode ?? undefined,
              }
            : null,
        note: input.note ?? null,
        attributes: input.attributes ?? [],
        updatedAt: input.updatedAt,
        custom: {},
    };
}
