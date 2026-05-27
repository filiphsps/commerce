type KindLineProps = {
    /** Symbol kind label (e.g. "function", "class", "component"). */
    kind: 'function' | 'class' | 'component' | 'type' | 'interface' | 'variable' | 'enum' | 'other';
    /** Slash-separated workspace + subpath (e.g. "cms/api"). */
    path: string;
    /** When present, renders a "throws" badge alongside the kind pill. */
    throws?: boolean;
};

/**
 * Metadata strip rendered at the top of every generated reference page,
 * showing the symbol's kind, the subpath it belongs to, and an optional
 * "throws" badge when `@throws` tags are present in the JSDoc. Styled via
 * the `.kind-line` CSS class in globals.css.
 *
 * @param props - Kind label, package path, and optional throws flag.
 * @returns A metadata strip as a paragraph-level block.
 */
export function KindLine({ kind, path, throws }: KindLineProps) {
    return (
        <div className="kind-line">
            <span className="dot">●</span>
            <span>{path}</span>
            <span className="sep">·</span>
            <span className="tag">{kind}</span>
            {throws ? (
                <>
                    <span className="sep">·</span>
                    <span className="tag throws">throws</span>
                </>
            ) : null}
        </div>
    );
}
