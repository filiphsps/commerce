/**
 * Parse and if required provide the best fallback for a
 * Shopify pricing string.
 *
 * @param {number | T} fallback - The fallback value.
 * @param {string | any} prices - The prices to parse.
 * @returns {(number | T)} The parsed price or the fallback.
 */
export const ShopifyPriceToNumber = <T>(fallback: number | T, ...prices: Array<string | any>): number | T => {
    for (let i = 0; i < prices.length; i++) {
        const priceString = prices[i];
        if (!priceString || !(typeof priceString === 'string' || priceString instanceof String)) continue;

        const price = Number.parseFloat(priceString as string);
        if (Number.isNaN(price) || price < 0) continue;

        return price;
    }

    return fallback;
};
