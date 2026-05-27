/**
 * ISO 4217 alphabetic currency code (e.g. `"USD"`, `"EUR"`, `"JPY"`). Used
 * wherever a currency denomination is required in the cart API to ensure
 * currency is always explicit and never inferred.
 *
 * @example
 * ```ts
 * const code: CurrencyCode = ctx.locale.currency;
 * const zero = money.zero(code);
 * ```
 */
export type CurrencyCode = string;

/**
 * Decimal-string money amount paired with its currency code, matching the
 * shape returned by most provider APIs. Pass to {@link money.parse} to
 * convert to integer cents before doing arithmetic.
 *
 * @example
 * ```ts
 * const price: Money = { amount: '12.99', currencyCode: 'USD' };
 * const cents = money.parse(price);
 * ```
 */
export type Money = { amount: string; currencyCode: CurrencyCode };

/**
 * Integer-cents money representation used for all arithmetic inside the cart
 * kernel. Avoids floating-point rounding by working in the currency's minor
 * units. Convert back to {@link Money} via {@link money.format}.
 *
 * @example
 * ```ts
 * const subtotal = money.parse(line.cost.subtotal);
 * const tax = money.mul(subtotal, 0.1);
 * const formatted = money.format(tax);
 * ```
 */
export type MoneyCents = { cents: number; currencyCode: CurrencyCode };

const scaleCache = new Map<CurrencyCode, number>();

/**
 * Resolves the ISO 4217 minor-unit count for a currency code via Intl,
 * memoizing the lookup so repeated arithmetic stays O(1).
 *
 * @param cc - ISO 4217 currency code (e.g. `USD`, `JPY`, `BHD`).
 * @returns Number of fractional digits used by the currency (0–4).
 */
function scale(cc: CurrencyCode): number {
    const cached = scaleCache.get(cc);
    if (cached !== undefined) return cached;
    const s =
        new Intl.NumberFormat('en', { style: 'currency', currency: cc }).resolvedOptions().maximumFractionDigits ?? 2;
    scaleCache.set(cc, s);
    return s;
}

/**
 * Guards binary money operations against mismatched currencies — adding USD
 * to EUR is always a programmer error, not silent FX conversion.
 *
 * @param a - Left operand.
 * @param b - Right operand.
 * @throws Error when `a.currencyCode !== b.currencyCode`.
 */
function assertSameCurrency(a: MoneyCents, b: MoneyCents): void {
    if (a.currencyCode !== b.currencyCode) {
        throw new Error(`Money currency mismatch: ${a.currencyCode} vs ${b.currencyCode}`);
    }
}

/**
 * Namespace of pure arithmetic helpers for {@link Money} and {@link MoneyCents}.
 * Always work in cents (via `money.parse`) before arithmetic, then convert
 * back with `money.format` — never do floating-point math on raw amount strings.
 *
 * @example
 * ```ts
 * const a = money.parse({ amount: '10.00', currencyCode: 'USD' });
 * const b = money.parse({ amount: '3.50', currencyCode: 'USD' });
 * const total = money.format(money.add(a, b)); // { amount: '13.50', currencyCode: 'USD' }
 * ```
 */
export const money = {
    /**
     * Converts a decimal-string money amount into an integer-cents
     * representation scaled by the currency's minor units.
     *
     * @param m - Money with decimal `amount` (e.g. `"12.34"`).
     * @returns Integer-cents money in the same currency.
     * @example
     * ```ts
     * money.parse({ amount: '9.99', currencyCode: 'USD' }); // { cents: 999, currencyCode: 'USD' }
     * ```
     */
    parse(m: Money): MoneyCents {
        const cents = Math.round(parseFloat(m.amount) * 10 ** scale(m.currencyCode));
        return { cents, currencyCode: m.currencyCode };
    },
    /**
     * Reverses {@link money.parse}: integer cents back to a fixed-precision
     * decimal string preserving the currency's scale.
     *
     * @param m - Integer-cents money.
     * @returns Decimal-string money in the same currency.
     * @example
     * ```ts
     * money.format({ cents: 999, currencyCode: 'USD' }); // { amount: '9.99', currencyCode: 'USD' }
     * ```
     */
    format(m: MoneyCents): Money {
        const s = scale(m.currencyCode);
        return { amount: (m.cents / 10 ** s).toFixed(s), currencyCode: m.currencyCode };
    },
    /**
     * Adds two cent amounts in the same currency.
     *
     * @param a - Left addend.
     * @param b - Right addend.
     * @returns `a + b` in `a.currencyCode`.
     * @throws Error when currencies differ.
     * @example
     * ```ts
     * const total = money.add(subtotal, tax);
     * ```
     */
    add(a: MoneyCents, b: MoneyCents): MoneyCents {
        assertSameCurrency(a, b);
        return { cents: a.cents + b.cents, currencyCode: a.currencyCode };
    },
    /**
     * Subtracts one cent amount from another in the same currency.
     *
     * @param a - Minuend.
     * @param b - Subtrahend.
     * @returns `a - b` in `a.currencyCode`.
     * @throws Error when currencies differ.
     * @example
     * ```ts
     * const discount = money.sub(original, discounted);
     * ```
     */
    sub(a: MoneyCents, b: MoneyCents): MoneyCents {
        assertSameCurrency(a, b);
        return { cents: a.cents - b.cents, currencyCode: a.currencyCode };
    },
    /**
     * Scalar multiplication; result is rounded to the nearest cent.
     *
     * @param a - Money amount.
     * @param n - Scalar multiplier.
     * @returns `a * n` in `a.currencyCode`.
     * @example
     * ```ts
     * const lineTotal = money.mul(unitPrice, quantity);
     * ```
     */
    mul(a: MoneyCents, n: number): MoneyCents {
        return { cents: Math.round(a.cents * n), currencyCode: a.currencyCode };
    },
    /**
     * Tests whether two cent amounts are equal in value and currency.
     *
     * @param a - Left side.
     * @param b - Right side.
     * @returns `true` iff equal in value and currency.
     * @throws Error when currencies differ.
     * @example
     * ```ts
     * if (money.eq(price, money.zero('USD'))) console.log('free item');
     * ```
     */
    eq(a: MoneyCents, b: MoneyCents): boolean {
        assertSameCurrency(a, b);
        return a.cents === b.cents;
    },
    /**
     * Tests whether `a` is strictly less than `b`.
     *
     * @param a - Left side.
     * @param b - Right side.
     * @returns `true` iff `a < b`.
     * @throws Error when currencies differ.
     * @example
     * ```ts
     * if (money.lt(balance, total)) throw new Error('insufficient funds');
     * ```
     */
    lt(a: MoneyCents, b: MoneyCents): boolean {
        assertSameCurrency(a, b);
        return a.cents < b.cents;
    },
    /**
     * Tests whether `a` is strictly greater than `b`.
     *
     * @param a - Left side.
     * @param b - Right side.
     * @returns `true` iff `a > b`.
     * @throws Error when currencies differ.
     * @example
     * ```ts
     * if (money.gt(subtotal, threshold)) applyFreeShipping(cart);
     * ```
     */
    gt(a: MoneyCents, b: MoneyCents): boolean {
        assertSameCurrency(a, b);
        return a.cents > b.cents;
    },
    /**
     * Creates a zero-amount sentinel in the given currency, useful as an
     * accumulator seed or a no-cost placeholder.
     *
     * @param cc - Currency code.
     * @returns Zero amount in the requested currency.
     * @example
     * ```ts
     * const total = lines.reduce((acc, l) => money.add(acc, money.parse(l.cost.subtotal)), money.zero('USD'));
     * ```
     */
    zero(cc: CurrencyCode): MoneyCents {
        return { cents: 0, currencyCode: cc };
    },
};
