/**
 * Converts the non-standard Prismic date format to ISO-8601.
 *
 * @param {string} date - The date string to convert.
 * @returns {string} The ISO-8601 date string.
 */
export const convertPrismicDateToISO = (date: string): string => {
    const result = new Date(date.replace(/(\+|-)(\d{2})(\d{2})$/, '.000$1$2:$3'));
    return result.toISOString();
};
