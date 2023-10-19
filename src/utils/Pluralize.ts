export const Pluralize = ({ count, noun, suffix = 's' }: { count: number; noun: string; suffix?: string }) =>
    `${noun}${(count !== 1 && suffix) || ''}`;
