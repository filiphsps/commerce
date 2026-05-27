'use server';

import { forms, typed } from '@/cart/kernel';

/**
 * Server Action: adds a line item to the active cart.
 *
 * @throws {Error} When the Shopify cart mutation fails or the transport layer throws.
 */
export const addLine = typed.addLine;

/**
 * Server Action: updates the quantity of an existing cart line item.
 *
 * @throws {Error} When the Shopify cart mutation fails or the transport layer throws.
 */
export const updateLine = typed.updateLine;

/**
 * Server Action: removes a line item from the active cart.
 *
 * @throws {Error} When the Shopify cart mutation fails or the transport layer throws.
 */
export const removeLine = typed.removeLine;

/**
 * Server Action: applies a discount code to the active cart.
 *
 * @throws {Error} When the Shopify cart mutation fails or the transport layer throws.
 */
export const applyDiscountCode = typed.applyDiscountCode;

/**
 * Server Action: removes a discount code from the active cart.
 *
 * @throws {Error} When the Shopify cart mutation fails or the transport layer throws.
 */
export const removeDiscountCode = typed.removeDiscountCode;

/**
 * Server Action: applies a gift card to the active cart.
 *
 * @throws {Error} When the Shopify cart mutation fails or the transport layer throws.
 */
export const applyGiftCard = typed.applyGiftCard;

/**
 * Server Action: removes a gift card from the active cart.
 *
 * @throws {Error} When the Shopify cart mutation fails or the transport layer throws.
 */
export const removeGiftCard = typed.removeGiftCard;

/**
 * Server Action: updates the order note on the active cart.
 *
 * @throws {Error} When the Shopify cart mutation fails or the transport layer throws.
 */
export const updateNote = typed.updateNote;

/**
 * Server Action: updates the custom attributes on the active cart.
 *
 * @throws {Error} When the Shopify cart mutation fails or the transport layer throws.
 */
export const updateAttributes = typed.updateAttributes;

/**
 * Server Action: updates the buyer identity (customer access token, country
 * code, etc.) on the active cart so the cart is associated with the signed-in
 * customer.
 *
 * @throws {Error} When the Shopify cart mutation fails or the transport layer throws.
 */
export const updateBuyerIdentity = typed.updateBuyerIdentity;

/**
 * Server Action: dispatches a raw mutation envelope to the cart kernel,
 * allowing callers to submit any registered mutation by name.
 *
 * @throws {Error} When the mutation fails or the kernel does not recognise the mutation name.
 */
export const dispatch = typed.dispatch;

/**
 * Server Action (form-compatible): adds a line item from a `FormData` submission.
 *
 * @throws {Error} When the Shopify cart mutation fails or the transport layer throws.
 */
export const addLineAction = forms.addLineAction;

/**
 * Server Action (form-compatible): updates a cart line item quantity from a `FormData` submission.
 *
 * @throws {Error} When the Shopify cart mutation fails or the transport layer throws.
 */
export const updateLineAction = forms.updateLineAction;

/**
 * Server Action (form-compatible): removes a line item from a `FormData` submission.
 *
 * @throws {Error} When the Shopify cart mutation fails or the transport layer throws.
 */
export const removeLineAction = forms.removeLineAction;

/**
 * Server Action (form-compatible): applies a discount code from a `FormData` submission.
 *
 * @throws {Error} When the Shopify cart mutation fails or the transport layer throws.
 */
export const applyDiscountCodeAction = forms.applyDiscountCodeAction;

/**
 * Server Action (form-compatible): removes a discount code from a `FormData` submission.
 *
 * @throws {Error} When the Shopify cart mutation fails or the transport layer throws.
 */
export const removeDiscountCodeAction = forms.removeDiscountCodeAction;

/**
 * Server Action (form-compatible): applies a gift card from a `FormData` submission.
 *
 * @throws {Error} When the Shopify cart mutation fails or the transport layer throws.
 */
export const applyGiftCardAction = forms.applyGiftCardAction;

/**
 * Server Action (form-compatible): removes a gift card from a `FormData` submission.
 *
 * @throws {Error} When the Shopify cart mutation fails or the transport layer throws.
 */
export const removeGiftCardAction = forms.removeGiftCardAction;

/**
 * Server Action (form-compatible): updates the order note from a `FormData` submission.
 *
 * @throws {Error} When the Shopify cart mutation fails or the transport layer throws.
 */
export const updateNoteAction = forms.updateNoteAction;

/**
 * Server Action (form-compatible): updates cart attributes from a `FormData` submission.
 *
 * @throws {Error} When the Shopify cart mutation fails or the transport layer throws.
 */
export const updateAttributesAction = forms.updateAttributesAction;

/**
 * Server Action (form-compatible): updates buyer identity from a `FormData` submission.
 *
 * @throws {Error} When the Shopify cart mutation fails or the transport layer throws.
 */
export const updateBuyerIdentityAction = forms.updateBuyerIdentityAction;
