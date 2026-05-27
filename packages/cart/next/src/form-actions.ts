import type { CartActionResult, KV } from '@nordcom/cart-core';

import type { TypedCartActions } from './typed-actions';

const MAX_QUANTITY = 1_000;
const MAX_ID_LENGTH = 512;
const MAX_CODE_LENGTH = 128;
const MAX_NOTE_LENGTH = 2_000;

type FormEntry = ReturnType<FormData['get']>;

/**
 * Coerces a `FormData` value into an integer quantity within
 * `[0, MAX_QUANTITY]`. Empty / missing entries fall back to the caller's
 * default so `add-line` forms can default to quantity 1 without forcing a
 * hidden input on the page.
 *
 * @param raw - Raw form entry value.
 * @param fallback - Value returned when the entry is missing or empty.
 * @returns The parsed integer quantity, or `null` when the entry is present
 *   but unparseable / out of range.
 */
function parseQuantity(raw: FormEntry, fallback: number): number | null {
    if (raw == null || raw === '') return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > MAX_QUANTITY) return null;
    return n;
}

/**
 * Validates a `FormData` value as an identifier string. Trims whitespace and
 * rejects empty / oversized values so a forged form can't smuggle a 10 MB
 * line id past the server action.
 *
 * @param raw - Raw form entry value.
 * @returns The trimmed id, or `null` when the input is missing or invalid.
 */
function parseId(raw: FormEntry): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_ID_LENGTH) return null;
    return trimmed;
}

/**
 * Validates a `FormData` value as a discount / gift-card code. Same trim +
 * length guardrails as {@link parseId} but with a tighter cap aligned to
 * Shopify code limits.
 *
 * @param raw - Raw form entry value.
 * @returns The trimmed code, or `null` when missing / invalid.
 */
function parseCode(raw: FormEntry): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_CODE_LENGTH) return null;
    return trimmed;
}

/**
 * Mints a fresh idempotency key for a form submission. Prefers `crypto.randomUUID`
 * when present (Node 19+, all modern runtimes); falls back to a millisecond
 * timestamp + random base36 suffix on hosts without WebCrypto so the package
 * keeps working in older runtimes.
 *
 * @returns A new idempotency key suitable for one mutation.
 */
function key(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Set of `FormData`-driven server actions returned by {@link createFormCartActions}.
 * Each method parses and validates a `FormData` payload before delegating to the
 * typed action surface, enabling native `<form action={…}>` wiring that works
 * without JavaScript while sharing the same server-side validation path as
 * progressively enhanced calls.
 *
 * @example
 * ```tsx
 * const formActions = createFormCartActions({ typed });
 * // In a Server Component:
 * <form action={formActions.addLineAction}>
 *   <input name="variantId" value="gid://shopify/ProductVariant/123" />
 *   <button type="submit">Add to cart</button>
 * </form>
 * ```
 */
export interface FormCartActions {
    addLineAction(formData: FormData): Promise<CartActionResult>;
    updateLineAction(formData: FormData): Promise<CartActionResult>;
    removeLineAction(formData: FormData): Promise<CartActionResult>;
    applyDiscountCodeAction(formData: FormData): Promise<CartActionResult>;
    removeDiscountCodeAction(formData: FormData): Promise<CartActionResult>;
    applyGiftCardAction(formData: FormData): Promise<CartActionResult>;
    removeGiftCardAction(formData: FormData): Promise<CartActionResult>;
    updateNoteAction(formData: FormData): Promise<CartActionResult>;
    updateAttributesAction(formData: FormData): Promise<CartActionResult>;
    updateBuyerIdentityAction(formData: FormData): Promise<CartActionResult>;
    dispatchAction(formData: FormData): Promise<CartActionResult>;
}

/**
 * Wraps a {@link TypedCartActions} surface in zero-JS `FormData` adapters.
 * Each wrapper parses the form, mints a server-side idempotency key, and
 * forwards the typed call — so the same action works whether the page is
 * progressively enhanced (predictive client queue) or running with JS
 * disabled (native `<form action={...}>`).
 *
 * Validation lives here, not in {@link TypedCartActions}: parsing failures
 * short-circuit with `ok: false` before any kernel call, so an invalid form
 * post never touches the cart provider.
 *
 * @param opts.typed - Typed action surface to dispatch through.
 * @returns A {@link FormCartActions} surface ready for `<form action>` bindings.
 */
export function createFormCartActions(opts: { typed: TypedCartActions }): FormCartActions {
    const { typed } = opts;
    return {
        async addLineAction(fd) {
            const variantId = parseId(fd.get('variantId'));
            if (!variantId) {
                return { ok: false, reason: 'missing-variant', message: 'Variant required.' };
            }
            const quantity = parseQuantity(fd.get('quantity'), 1);
            if (quantity == null || quantity < 1) {
                return { ok: false, reason: 'invalid-quantity', message: 'Invalid quantity.' };
            }
            return typed.addLine({ variantId, quantity, idempotencyKey: key() });
        },
        async updateLineAction(fd) {
            const lineId = parseId(fd.get('lineId'));
            if (!lineId) {
                return { ok: false, reason: 'missing-line', message: 'Line required.' };
            }
            const quantity = parseQuantity(fd.get('quantity'), Number.NaN);
            if (quantity == null || Number.isNaN(quantity)) {
                return { ok: false, reason: 'invalid-quantity', message: 'Invalid quantity.' };
            }
            return typed.updateLine({ lineId, quantity, idempotencyKey: key() });
        },
        async removeLineAction(fd) {
            const lineId = parseId(fd.get('lineId'));
            if (!lineId) {
                return { ok: false, reason: 'missing-line', message: 'Line required.' };
            }
            return typed.removeLine({ lineId, idempotencyKey: key() });
        },
        async applyDiscountCodeAction(fd) {
            const code = parseCode(fd.get('code'));
            if (!code) {
                return { ok: false, reason: 'invalid-code', message: 'Invalid code.' };
            }
            return typed.applyDiscountCode({ code, idempotencyKey: key() });
        },
        async removeDiscountCodeAction(fd) {
            const code = parseCode(fd.get('code')) ?? '';
            return typed.removeDiscountCode({ code, idempotencyKey: key() });
        },
        async applyGiftCardAction(fd) {
            const code = parseCode(fd.get('code'));
            if (!code) {
                return { ok: false, reason: 'invalid-code', message: 'Invalid code.' };
            }
            return typed.applyGiftCard({ code, idempotencyKey: key() });
        },
        async removeGiftCardAction(fd) {
            const id = parseId(fd.get('id'));
            if (!id) {
                return { ok: false, reason: 'invalid-code', message: 'Invalid id.' };
            }
            return typed.removeGiftCard({ id, idempotencyKey: key() });
        },
        async updateNoteAction(fd) {
            const noteRaw = fd.get('note');
            const note = typeof noteRaw === 'string' ? noteRaw.slice(0, MAX_NOTE_LENGTH) : '';
            return typed.updateNote({ note, idempotencyKey: key() });
        },
        async updateAttributesAction(fd) {
            const raw = fd.get('attributes');
            if (typeof raw !== 'string') {
                return {
                    ok: false,
                    reason: 'invalid-code',
                    message: 'Invalid attributes payload.',
                };
            }
            let attributes: KV[] = [];
            try {
                const parsed: unknown = JSON.parse(raw);
                if (!Array.isArray(parsed)) {
                    return {
                        ok: false,
                        reason: 'invalid-code',
                        message: 'Invalid attributes payload.',
                    };
                }
                attributes = parsed.filter(
                    (a: unknown): a is KV =>
                        !!a && typeof (a as KV).key === 'string' && typeof (a as KV).value === 'string',
                );
            } catch {
                return {
                    ok: false,
                    reason: 'invalid-code',
                    message: 'Invalid attributes payload.',
                };
            }
            return typed.updateAttributes({ attributes, idempotencyKey: key() });
        },
        async updateBuyerIdentityAction() {
            return typed.updateBuyerIdentity({ idempotencyKey: key() });
        },
        async dispatchAction(fd) {
            const raw = fd.get('envelope');
            if (typeof raw !== 'string') {
                return { ok: false, reason: 'invalid-code', message: 'Invalid envelope.' };
            }
            try {
                const envelope = JSON.parse(raw);
                return typed.dispatch(envelope);
            } catch {
                return { ok: false, reason: 'invalid-code', message: 'Malformed envelope JSON.' };
            }
        },
    };
}
