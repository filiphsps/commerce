type KindLineProps = {
    /** Symbol kind label (e.g. "function", "class", "component"). */
    kind: 'function' | 'class' | 'component' | 'type' | 'interface' | 'variable' | 'enum' | 'other';
    /** Slash-separated workspace + subpath (e.g. "cms/api"). */
    path: string;
    /** When set, prefixes the kind tag with "async". */
    isAsync?: boolean;
    /** When set, adds a "throws <ClassName>" amber pill. Pass the class name. */
    throws?: string | true;
    /** When set, adds a "returns nullable" hint. */
    returnsNullable?: boolean;
};

/**
 * Metadata strip rendered at the top of every generated reference page.
 * Shows the symbol's package + subpath, an "async function" / "class" /
 * "component" tag, an optional amber `throws <ClassName>` pill, and an
 * optional `returns nullable` hint — matching visuals/02-page-reference.html.
 *
 * @param props - Kind label, package path, and optional async / throws / nullable flags.
 * @returns A metadata strip as a paragraph-level block.
 */
export function KindLine({ kind, path, isAsync, throws, returnsNullable }: KindLineProps) {
    const segments = path.split('/');
    const display = segments.length > 1 ? `${segments[0]} · /${segments.slice(1).join('/')}` : path;
    const kindLabel = isAsync && kind === 'function' ? 'async function' : kind;
    return (
        <div className="not-prose mb-6 flex flex-wrap items-center gap-2 text-[0.8125rem] text-fg-mute">
            <span className="text-[0.5rem] text-brand">●</span>
            <span className="font-mono">{display}</span>
            <span className="text-fg-dim">·</span>
            <span
                className={`rounded border-[0.138rem] px-2 py-0.5 font-mono font-semibold text-xs ${
                    isAsync && kind === 'function'
                        ? 'border-ref/40 bg-ref/10 text-ref'
                        : 'border-border-strong bg-bg-2 text-fg'
                }`}
            >
                {kindLabel}
            </span>
            {throws ? (
                <span className="rounded border-[0.138rem] border-err/40 bg-err/10 px-2 py-0.5 font-mono font-semibold text-err text-xs">
                    throws {throws === true ? '' : throws}
                </span>
            ) : null}
            {returnsNullable ? (
                <>
                    <span className="text-fg-dim">·</span>
                    <span className="font-mono">returns nullable</span>
                </>
            ) : null}
        </div>
    );
}
