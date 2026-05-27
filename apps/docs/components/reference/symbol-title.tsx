type SymbolTitleProps = {
    /** Symbol name (e.g. `getArticle`, `useCart`, `CartProvider`). */
    name: string;
};

/**
 * Render a reference symbol's h1 with a brand-magenta accent on the trailing
 * portion of its camel- or Pascal-cased name (e.g. `get` + `Article`). Falls
 * back to the plain name when the split is ambiguous. Mirrors the
 * `h1.symbol-h1 .acc` treatment from visuals/02-page-reference.html.
 *
 * @param props - Symbol name.
 * @returns An h1 element with the second-half characters wrapped in a
 *   brand-coloured span.
 */
export function SymbolTitle({ name }: SymbolTitleProps) {
    const splitIdx = findAccentSplit(name);
    const head = splitIdx > 0 ? name.slice(0, splitIdx) : name;
    const tail = splitIdx > 0 ? name.slice(splitIdx) : '';
    return (
        <h1 className="not-prose mb-2 break-all font-black text-[2.6rem] text-fg leading-none tracking-tight sm:text-[3.2rem] md:break-normal">
            {head}
            {tail ? <span className="text-brand">{tail}</span> : null}
        </h1>
    );
}

/**
 * Find the index where the brand accent should start. Splits on the first
 * uppercase letter that is not the very first character (so `getArticle`
 * splits at `A`, `CartProvider` splits at `P`, and `useCart` splits at `C`).
 * Symbols that are all-uppercase or all-lowercase return `-1` (no accent).
 *
 * @param name - Symbol name.
 * @returns The split index or `-1` when no accent is applicable.
 */
function findAccentSplit(name: string): number {
    if (name.length < 2) return -1;
    for (let i = 1; i < name.length; i++) {
        const c = name[i] as string;
        if (c >= 'A' && c <= 'Z') return i;
    }
    return -1;
}
