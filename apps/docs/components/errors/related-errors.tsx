type RelatedError = {
    /** SCREAMING_SNAKE_CASE error code. */
    code: string;
    /** One-line description for the card body. */
    description?: string;
    /** Page URL — typically `/errors/<kebab>/`. */
    href: string;
};

/**
 * Responsive card grid for related error codes. Hover lights up the border in
 * the errors palette (amber). Reference: visuals/04-page-errors.html.
 *
 * @param props - Array of related error entries.
 * @returns A grid container of `a.related-card` elements.
 */
export function RelatedErrors({ items }: { items: RelatedError[] }) {
    if (items.length === 0) return null;
    return (
        <div className="not-prose grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
            {items.map((item) => (
                <a
                    key={item.code}
                    href={item.href}
                    className="block rounded-[0.45rem] border-[0.138rem] border-border bg-bg-1 px-3.5 py-3 no-underline transition-colors duration-150 hover:border-err hover:bg-err/5"
                >
                    <div className="font-mono font-semibold text-[0.78rem] text-err">{item.code}</div>
                    {item.description ? (
                        <div className="mt-1 font-medium text-[0.75rem] text-fg-mute leading-snug">
                            {item.description}
                        </div>
                    ) : null}
                </a>
            ))}
        </div>
    );
}
