export type Money = { amount: string | number; currencyCode: string };

/**
 * Formats a monetary amount into a locale-specific currency string.
 *
 * @param money - Amount and ISO 4217 currency code to format.
 * @param locale - BCP 47 locale tag passed to `Intl.NumberFormat` for currency display rules.
 * @returns The formatted price string (e.g., `"$10.00"` or `"10,00 €"`).
 */
export function formatPrice(money: Money, locale: string): string {
    const value = typeof money.amount === 'string' ? Number(money.amount) : money.amount;
    return new Intl.NumberFormat(locale, { style: 'currency', currency: money.currencyCode }).format(value);
}
