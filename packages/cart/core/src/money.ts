export type CurrencyCode = string;
export type Money = { amount: string; currencyCode: CurrencyCode };
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

export const money = {
    /**
     * Converts a decimal-string money amount into an integer-cents
     * representation scaled by the currency's minor units.
     *
     * @param m - Money with decimal `amount` (e.g. `"12.34"`).
     * @returns Integer-cents money in the same currency.
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
     */
    format(m: MoneyCents): Money {
        const s = scale(m.currencyCode);
        return { amount: (m.cents / 10 ** s).toFixed(s), currencyCode: m.currencyCode };
    },
    /**
     * @param a - Left addend.
     * @param b - Right addend.
     * @returns `a + b` in `a.currencyCode`.
     * @throws Error when currencies differ.
     */
    add(a: MoneyCents, b: MoneyCents): MoneyCents {
        assertSameCurrency(a, b);
        return { cents: a.cents + b.cents, currencyCode: a.currencyCode };
    },
    /**
     * @param a - Minuend.
     * @param b - Subtrahend.
     * @returns `a - b` in `a.currencyCode`.
     * @throws Error when currencies differ.
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
     */
    mul(a: MoneyCents, n: number): MoneyCents {
        return { cents: Math.round(a.cents * n), currencyCode: a.currencyCode };
    },
    /**
     * @param a - Left side.
     * @param b - Right side.
     * @returns `true` iff equal in value and currency.
     * @throws Error when currencies differ.
     */
    eq(a: MoneyCents, b: MoneyCents): boolean {
        assertSameCurrency(a, b);
        return a.cents === b.cents;
    },
    /**
     * @param a - Left side.
     * @param b - Right side.
     * @returns `true` iff `a < b`.
     * @throws Error when currencies differ.
     */
    lt(a: MoneyCents, b: MoneyCents): boolean {
        assertSameCurrency(a, b);
        return a.cents < b.cents;
    },
    /**
     * @param a - Left side.
     * @param b - Right side.
     * @returns `true` iff `a > b`.
     * @throws Error when currencies differ.
     */
    gt(a: MoneyCents, b: MoneyCents): boolean {
        assertSameCurrency(a, b);
        return a.cents > b.cents;
    },
    /**
     * @param cc - Currency code.
     * @returns Zero amount in the requested currency.
     */
    zero(cc: CurrencyCode): MoneyCents {
        return { cents: 0, currencyCode: cc };
    },
};
