/**
 * Parse and if required rovide the best fallback for a
 * Shopify pricing string.
 *
 * @param fallback
 * @param prices array of strings | any
 * @returns number | typeof fallback
 */
export const ShopifyPriceToNumber = <T>(fallback: number | T, ...prices: Array<string | any>): number | T => {
    for (let i = 0; i < prices.length; i++) {
        const priceString = prices[i];
        if (!priceString || !(typeof priceString === 'string' || priceString instanceof String)) continue;

        const price = Number.parseFloat(priceString as string);
        if (Number.isNaN(price)) continue;

        return price;
    }

    return fallback;
};
