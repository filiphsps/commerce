/**
 * Returns a date `daysAhead` days from now formatted as `YYYY-MM-DD` in the
 * caller's locale. Encapsulating `Date.now()` here keeps render functions free
 * of impure calls while still giving callers a fresh value per invocation.
 *
 * @param {number} daysAhead - Number of days to add to the current time.
 * @returns {string} The formatted future date string.
 */
export const futureDateString = (daysAhead: number): string =>
    new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

/**
 * Parse and if required provide the best fallback,
 * mostly used with a Shopify pricing string.
 *
 * @param {number | T} fallback - The fallback value.
 * @param {string | any} prices - The prices to parse.
 * @returns {(number | T)} The parsed price or the fallback.
 */
export const safeParseFloat = <T>(fallback: number | T, ...prices: Array<string | unknown>): number | T => {
    for (let i = 0; i < prices.length; i++) {
        const priceString = prices[i];
        if (!priceString || !(typeof priceString === 'string' || priceString instanceof String)) {
            continue;
        }

        const price = Number.parseFloat(priceString as string);
        if (Number.isNaN(price) || price < 0) {
            continue;
        }

        return price;
    }

    return fallback;
};
