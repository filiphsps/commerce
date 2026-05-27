import 'server-only';

import type { CartActionFailureReason } from '@nordcom/cart-core';
import { getDictionary } from '@/utils/dictionary';
import { getTranslations } from '@/utils/locale';
import { getRequestContext } from '@/utils/request-context';

/**
 * Translate a {@link CartActionFailureReason} into a user-facing string using
 * the storefront's per-tenant dictionary. Falls back to the raw provider
 * message when given a non-empty user error, so Shopify validation strings
 * (e.g. "Sold out") reach the customer verbatim instead of a generic
 * `"cart-errors.user-error"` lookup.
 *
 * @param reason - The failure reason that drove the action result.
 * @param userErrorMessage - Optional raw provider message; if non-empty it is
 *   returned as-is to preserve provider-specific copy.
 * @returns A localized string, or `'Cart action failed.'` when the request
 *   context is unavailable (e.g. during build / tests without headers).
 */
export async function messageLocalizer(reason: CartActionFailureReason, userErrorMessage?: string): Promise<string> {
    if (userErrorMessage && userErrorMessage.length > 0) return userErrorMessage;
    const ctx = await getRequestContext();
    if (!ctx) return 'Cart action failed.';
    const i18n = await getDictionary({ shop: ctx.shop, locale: ctx.locale });
    const { t } = getTranslations('cart-errors' as Parameters<typeof getTranslations>[0], i18n);
    return t(reason as Parameters<typeof t>[0]);
}
