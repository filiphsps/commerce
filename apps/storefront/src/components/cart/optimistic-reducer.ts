import type { Cart, CartLine } from '@/api/cart/types';

export type CartMutation =
    | {
          kind: 'add-line';
          variantId: string;
          quantity: number;
          tempId: string;
          attributes?: Array<{ key: string; value: string }>;
      }
    | { kind: 'update-line'; lineId: string; quantity: number }
    | { kind: 'remove-line'; lineId: string }
    | { kind: 'apply-discount'; code: string }
    | { kind: 'remove-discount'; code: string }
    | { kind: 'apply-gift-card'; code: string }
    | { kind: 'remove-gift-card'; id: string }
    | { kind: 'update-note'; note: string }
    | { kind: 'update-attributes'; attributes: Array<{ key: string; value: string }> };

function synthesizePlaceholderLine(m: Extract<CartMutation, { kind: 'add-line' }>, currencyCode: string): CartLine {
    return {
        id: m.tempId,
        quantity: m.quantity,
        merchandise: {
            id: m.variantId,
            productId: '',
            productHandle: '',
            productTitle: '',
            productVendor: null,
            productType: null,
            variantTitle: '',
            image: null,
            selectedOptions: [],
            unitPrice: { amount: '0', currencyCode },
            compareAtUnitPrice: null,
            availableForSale: true,
            quantityAvailable: null,
            sku: null,
        },
        cost: {
            subtotal: { amount: '0', currencyCode },
            total: { amount: '0', currencyCode },
        },
        attributes: m.attributes ?? [],
        discountAllocations: [],
    };
}

export function applyOptimistic(cart: Cart | null, m: CartMutation): Cart | null {
    if (!cart) return null;
    const markStale = (c: Cart): Cart => ({ ...c, costStale: true });
    const currencyCode = cart.cost.subtotal.currencyCode;

    switch (m.kind) {
        case 'add-line': {
            const existing = cart.lines.find((l) => l.merchandise.id === m.variantId);
            if (existing) {
                return markStale({
                    ...cart,
                    totalQuantity: cart.totalQuantity + m.quantity,
                    lines: cart.lines.map((l) =>
                        l.id === existing.id ? { ...l, quantity: l.quantity + m.quantity } : l,
                    ),
                });
            }
            return markStale({
                ...cart,
                totalQuantity: cart.totalQuantity + m.quantity,
                lines: [...cart.lines, synthesizePlaceholderLine(m, currencyCode)],
            });
        }
        case 'update-line': {
            const line = cart.lines.find((l) => l.id === m.lineId);
            if (!line) return cart;
            if (m.quantity === 0) {
                return markStale({
                    ...cart,
                    totalQuantity: cart.totalQuantity - line.quantity,
                    lines: cart.lines.filter((l) => l.id !== m.lineId),
                });
            }
            const delta = m.quantity - line.quantity;
            return markStale({
                ...cart,
                totalQuantity: cart.totalQuantity + delta,
                lines: cart.lines.map((l) => (l.id === m.lineId ? { ...l, quantity: m.quantity } : l)),
            });
        }
        case 'remove-line': {
            const line = cart.lines.find((l) => l.id === m.lineId);
            if (!line) return cart;
            return markStale({
                ...cart,
                totalQuantity: cart.totalQuantity - line.quantity,
                lines: cart.lines.filter((l) => l.id !== m.lineId),
            });
        }
        case 'apply-discount':
        case 'remove-discount':
        case 'apply-gift-card':
        case 'remove-gift-card':
        case 'update-note':
        case 'update-attributes':
            return markStale(cart);
    }
}
