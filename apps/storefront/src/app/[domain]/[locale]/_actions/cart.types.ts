// Constants and types for the cart server actions. Lives in a sibling module
// because Next.js's file-level `'use server'` directive in `./cart.ts` only
// permits async function exports — any non-function export at the top level
// of a `'use server'` file is a build error.

export type {
    BuyerIdentity,
    Cart,
    CartActionFailureReason,
    CartActionResult,
    CartLine,
    Money,
    NewCartLine,
} from '@/api/cart/types';

export const CART_COOKIE = 'nordcom-cart';
