/**
 * Pluralize a noun based on a count
 *
 * @param options - The options.
 * @param options.count - The count of the noun
 * @param options.noun - The noun to pluralize
 * @param [options.suffix='s'] - The suffix to add to the noun if the count is not 1
 * @returns The pluralized noun
 */
export const pluralize = ({ count = 0, noun, suffix = 's' }: { count: number; noun: string; suffix?: string }) =>
    `${noun}${(count !== 1 && suffix) || ''}`;
