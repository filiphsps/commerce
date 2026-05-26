import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';

export type Money = { amount: string; currencyCode: string };

export type BuyerIdentity = {
    customerAccessToken?: string;
    email?: string;
    phone?: string;
    countryCode?: string;
};

export type CartLineMerchandise = {
    id: string;
    productHandle: string;
    productTitle: string;
    variantTitle: string;
    image: { url: string; altText: string | null; width: number; height: number } | null;
    selectedOptions: Array<{ name: string; value: string }>;
    unitPrice: Money;
    compareAtUnitPrice: Money | null;
    availableForSale: boolean;
    quantityAvailable: number | null;
    sku: string | null;
};

export type CartLine = {
    id: string;
    quantity: number;
    merchandise: CartLineMerchandise;
    cost: { subtotal: Money; total: Money };
    attributes: Array<{ key: string; value: string }>;
    discountAllocations: Array<{ discountedAmount: Money; title?: string; code?: string }>;
};

export type Cart = {
    id: string;
    providerType: string;
    totalQuantity: number;
    checkoutUrl: string | null;
    lines: CartLine[];
    cost: {
        subtotal: Money;
        total: Money | null;
        tax: Money | null;
        shipping: Money | null;
    };
    costStale: boolean;
    discountCodes: Array<{ code: string; applicable: boolean }>;
    giftCards: Array<{ id: string; lastCharacters: string; amountLeft: Money }>;
    buyerIdentity: BuyerIdentity | null;
    note: string | null;
    attributes: Array<{ key: string; value: string }>;
    updatedAt: string;
};

export type NewCartLine = {
    variantId: string;
    quantity: number;
    attributes?: Array<{ key: string; value: string }>;
};

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

export type CartActionResult =
    | { ok: true; cart: Cart }
    | {
          ok: false;
          reason: CartActionFailureReason;
          message: string;
          userErrors?: Array<{ field?: string; message: string }>;
          cart?: Cart;
      };

export interface CartProviderAdapter {
    readonly type: string;

    getCart(args: { cartId: string; shop: OnlineShop; locale: Locale }): Promise<Cart | null>;

    createCart(args: {
        shop: OnlineShop;
        locale: Locale;
        lines?: NewCartLine[];
        buyerIdentity?: BuyerIdentity;
    }): Promise<Cart>;

    addLines(args: { cartId: string; shop: OnlineShop; locale: Locale; lines: NewCartLine[] }): Promise<Cart>;

    updateLines(args: {
        cartId: string;
        shop: OnlineShop;
        locale: Locale;
        lines: Array<{ id: string; quantity: number }>;
    }): Promise<Cart>;

    removeLines(args: { cartId: string; shop: OnlineShop; locale: Locale; lineIds: string[] }): Promise<Cart>;

    applyDiscountCodes(args: { cartId: string; shop: OnlineShop; locale: Locale; codes: string[] }): Promise<Cart>;

    applyGiftCardCodes(args: { cartId: string; shop: OnlineShop; locale: Locale; codes: string[] }): Promise<Cart>;

    removeGiftCardCodes(args: { cartId: string; shop: OnlineShop; locale: Locale; ids: string[] }): Promise<Cart>;

    updateBuyerIdentity(args: {
        cartId: string;
        shop: OnlineShop;
        locale: Locale;
        buyerIdentity: BuyerIdentity;
    }): Promise<Cart>;

    updateNote(args: { cartId: string; shop: OnlineShop; locale: Locale; note: string }): Promise<Cart>;

    updateAttributes(args: {
        cartId: string;
        shop: OnlineShop;
        locale: Locale;
        attributes: Array<{ key: string; value: string }>;
    }): Promise<Cart>;
}
