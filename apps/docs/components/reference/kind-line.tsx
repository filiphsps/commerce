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
 * "throws" badge when `@throws` tags are present in the JSDoc.
 *
 * @param props - Kind label, package path, and optional throws flag.
 * @returns A metadata strip as a paragraph-level block.
 */
export function KindLine({ kind, path, throws }: KindLineProps) {
    return (
        <div className="mb-6 flex items-center gap-2 text-[0.8125rem] text-fg-mute">
            <span className="text-[0.5rem] text-brand">●</span>
            <span>{path}</span>
            <span className="text-fg-dim">·</span>
            <span className="rounded bg-bg-2 px-2 py-0.5 font-mono font-semibold text-xs">{kind}</span>
            {throws ? (
                <>
                    <span className="text-fg-dim">·</span>
                    <span className="rounded bg-bg-2 px-2 py-0.5 font-mono font-semibold text-err text-xs">throws</span>
                </>
            ) : null}
        </div>
    );
}
