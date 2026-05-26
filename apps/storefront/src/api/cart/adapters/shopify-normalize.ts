import type { Cart, CartLine, CartLineMerchandise, Money } from '../types';

type ShopifyCart = any;

const money = (m: { amount: string; currencyCode: string } | null | undefined): Money | null => {
    if (!m) return null;
    return { amount: m.amount, currencyCode: m.currencyCode };
};

const moneyOr = (m: { amount: string; currencyCode: string } | null | undefined, fallback: Money): Money => {
    return money(m) ?? fallback;
};

const ZERO_MONEY = (currencyCode: string): Money => ({ amount: '0', currencyCode });

function normalizeMerchandise(merch: any, currencyCode: string): CartLineMerchandise {
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

function normalizeLine(edge: any, currencyCode: string): CartLine {
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
        discountAllocations: (node.discountAllocations ?? []).map((d: any) => ({
            discountedAmount: moneyOr(d.discountedAmount, ZERO_MONEY(currencyCode)),
            title: d.title,
            code: d.code,
        })),
    };
}

export function normalize(input: ShopifyCart | null | undefined): Cart | null {
    if (!input) return null;
    const currencyCode = input.cost?.subtotalAmount?.currencyCode ?? 'USD';
    const subtotal = moneyOr(input.cost?.subtotalAmount, ZERO_MONEY(currencyCode));
    const lines: CartLine[] = (input.lines?.edges ?? []).map((edge: any) => normalizeLine(edge, currencyCode));
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
        discountCodes: (input.discountCodes ?? []).map((d: any) => ({
            code: d.code,
            applicable: d.applicable,
        })),
        giftCards: (input.appliedGiftCards ?? []).map((g: any) => ({
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
