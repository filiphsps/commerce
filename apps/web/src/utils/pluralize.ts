/**
 * Pluralize a noun based on a count
 *
 * @param {number} count - The count of the noun
 * @param {string} noun - The noun to pluralize
 * @param {string} suffix - The suffix to add to the noun if the count is not 1
 * @returns {string} The pluralized noun
 */
export const Pluralize = ({ count, noun, suffix = 's' }: { count: number; noun: string; suffix?: string }) =>
    `${noun}${(count !== 1 && suffix) || ''}`;
