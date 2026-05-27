import type { CurrencyCode, Money } from './money';

export type { CurrencyCode, Money } from './money';

export type LocaleTuple = { language: string; country: string; currency: CurrencyCode };

export type BuyerIdentity = {
    email?: string;
    phone?: string;
    countryCode?: string;
    provider?: { type: string; data: Record<string, unknown> };
};

export type CartExt = { cart?: unknown; line?: unknown };

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

export type CartLine<L = {}> = {
    id: string;
    quantity: number;
    merchandise: CartLineMerchandise;
    cost: { subtotal: Money; total: Money };
    attributes: Array<{ key: string; value: string }>;
    discountAllocations: Array<{ discountedAmount: Money; title?: string; code?: string }>;
    custom: L;
};

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

export type NewCartLine = {
    variantId: string;
    quantity: number;
    attributes?: Array<{ key: string; value: string }>;
};

export type ProductSnapshot = {
    variantId: string;
    productHandle: string;
    productTitle: string;
    variantTitle: string;
    image: { url: string; altText: string | null; width: number; height: number } | null;
    unitPrice: Money;
    compareAtUnitPrice?: Money | null;
};

export type KV = { key: string; value: string };

export type CartMutation =
    | { kind: 'add-line'; variantId: string; quantity: number; attributes?: KV[]; snapshot?: ProductSnapshot }
    | { kind: 'update-line'; lineId: string; quantity: number }
    | { kind: 'remove-line'; lineId: string }
    | { kind: 'apply-discount'; code: string }
    | { kind: 'remove-discount'; code: string }
    | { kind: 'apply-gift-card'; code: string }
    | { kind: 'remove-gift-card'; id: string }
    | { kind: 'update-note'; note: string }
    | { kind: 'update-attributes'; attributes: KV[] }
    | { kind: 'update-buyer-identity' }
    | { kind: 'custom'; name: string; payload: unknown };

export type MutationEnvelope = { mutation: CartMutation; idempotencyKey: string };

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

export type CartActionResult<TExt extends CartExt = {}> =
    | { ok: true; cart: Cart<TExt> }
    | {
          ok: false;
          reason: CartActionFailureReason;
          message: string;
          userErrors?: Array<{ field?: string; message: string }>;
          cart?: Cart<TExt>;
      };

export type SubmitMutation<TExt extends CartExt = {}> = (envelope: MutationEnvelope) => Promise<CartActionResult<TExt>>;

export interface ILogger {
    debug: (msg: string, meta?: Record<string, unknown>) => void;
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
}

export const consoleLogger: ILogger = {
    debug: (msg, meta) => console.debug(`[cart] ${msg}`, meta ?? ''),
    info: (msg, meta) => console.info(`[cart] ${msg}`, meta ?? ''),
    warn: (msg, meta) => console.warn(`[cart] ${msg}`, meta ?? ''),
    error: (msg, meta) => console.error(`[cart] ${msg}`, meta ?? ''),
};

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

export type AdapterCtx<TShop = unknown> = {
    shop: TShop;
    locale: LocaleTuple;
    idempotencyKey?: string;
    signal?: AbortSignal;
    logger: ILogger;
    tracer?: ITracer;
};
