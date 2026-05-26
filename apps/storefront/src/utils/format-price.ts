export type Money = { amount: string | number; currencyCode: string };

export function formatPrice(money: Money, locale: string): string {
    const value = typeof money.amount === 'string' ? Number(money.amount) : money.amount;
    return new Intl.NumberFormat(locale, { style: 'currency', currency: money.currencyCode }).format(value);
}
