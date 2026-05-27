'use server';

import { forms, typed } from '@/cart/kernel';

export const addLine = typed.addLine;
export const updateLine = typed.updateLine;
export const removeLine = typed.removeLine;
export const applyDiscountCode = typed.applyDiscountCode;
export const removeDiscountCode = typed.removeDiscountCode;
export const applyGiftCard = typed.applyGiftCard;
export const removeGiftCard = typed.removeGiftCard;
export const updateNote = typed.updateNote;
export const updateAttributes = typed.updateAttributes;
export const updateBuyerIdentity = typed.updateBuyerIdentity;
export const dispatch = typed.dispatch;

export const addLineAction = forms.addLineAction;
export const updateLineAction = forms.updateLineAction;
export const removeLineAction = forms.removeLineAction;
export const applyDiscountCodeAction = forms.applyDiscountCodeAction;
export const removeDiscountCodeAction = forms.removeDiscountCodeAction;
export const applyGiftCardAction = forms.applyGiftCardAction;
export const removeGiftCardAction = forms.removeGiftCardAction;
export const updateNoteAction = forms.updateNoteAction;
export const updateAttributesAction = forms.updateAttributesAction;
export const updateBuyerIdentityAction = forms.updateBuyerIdentityAction;
