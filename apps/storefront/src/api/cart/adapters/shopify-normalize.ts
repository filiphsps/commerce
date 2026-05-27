import type { Cart, CartLine, CartLineMerchandise, Money } from '../types';

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

const money = (m: ShopifyMoney | null | undefined): Money | null => {
    if (!m) return null;
    return { amount: m.amount, currencyCode: m.currencyCode };
};

const moneyOr = (m: ShopifyMoney | null | undefined, fallback: Money): Money => {
    return money(m) ?? fallback;
};

const ZERO_MONEY = (currencyCode: string): Money => ({ amount: '0', currencyCode });

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
    };
}

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
                  customerAccessToken: undefined,
                  email: input.buyerIdentity.email ?? undefined,
                  phone: input.buyerIdentity.phone ?? undefined,
                  countryCode: input.buyerIdentity.countryCode ?? undefined,
              }
            : null,
        note: input.note ?? null,
        attributes: input.attributes ?? [],
        updatedAt: input.updatedAt,
    };
}
