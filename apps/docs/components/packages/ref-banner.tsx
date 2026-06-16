import Link from 'fumadocs-core/link';
import symbolIndex from '../../lib/symbol-index.generated.json';

type SymbolEntry = { url: string; kind: string; tab: string; pkg: string; subpath: string };

type RefBannerProps = {
    /**
     * Slash-separated path matching the symbol index `pkg/subpath` key, e.g.
     * `"cms/api"` for `/reference/cms/api/`. Omit to suppress the banner.
     */
    refPath: string;
    /** Semver badge shown on the right, e.g. `"v0.1.0"`. */
    version?: string;
};

type KindCounts = {
    total: number;
    function: number;
    type: number;
    interface: number;
    class: number;
    variable: number;
};

/**
 * Count symbols in the generated symbol index that belong to a given
 * `pkg/subpath` key.
 *
 * @param refPath - `pkg/subpath` key, e.g. `"cms/api"`.
 * @returns Object with counts per kind plus a total.
 */
function countSymbols(refPath: string): KindCounts {
    const counts: KindCounts = { total: 0, function: 0, type: 0, interface: 0, class: 0, variable: 0 };
    const parts = refPath.split('/');
    const pkg = parts[0] ?? '';
    const subpath = parts.slice(1).join('/') || 'index';

    const rawIndex = symbolIndex as unknown as Record<string, SymbolEntry[]>;
    for (const entries of Object.values(rawIndex)) {
        for (const entry of entries) {
            if (entry.pkg === pkg && entry.subpath === subpath) {
                counts.total++;
                const k = entry.kind as keyof KindCounts;
                if (k in counts) counts[k]++;
            }
        }
    }
    return counts;
}

/**
 * Cross-link banner rendered at the top of packages narrative pages to guide
 * readers to the generated Reference catalog for the same subpath. Shows the
 * reference path, export count breakdown, and an optional version badge.
 * Matches the `.ref-banner` pattern in visuals/03-page-packages.html.
 *
 * @param props - Reference path and optional version string.
 * @returns The ref-banner anchor element, or null when no symbols exist.
 */
export function RefBanner({ refPath, version }: RefBannerProps) {
    const counts = countSymbols(refPath);
    if (counts.total === 0) return null;

    const href = `/reference/${refPath}/`;
    const pathLabel = refPath.replace(/\//g, ' / ');

    const fnCount = counts.function;
    const typeCount = counts.type + counts.interface;
    const classCount = counts.class;

    const parts: string[] = [];
    if (fnCount > 0) parts.push(`${fnCount} ${fnCount === 1 ? 'function' : 'functions'}`);
    if (typeCount > 0) parts.push(`${typeCount} ${typeCount === 1 ? 'type' : 'types'}`);
    if (classCount > 0) parts.push(`${classCount} ${classCount === 1 ? 'class' : 'classes'}`);

    const countSummary = parts.join(', ');

    return (
        <Link
            href={href}
            className="not-prose ref-banner group mb-8 grid items-center gap-6 rounded-[0.45rem] border-[0.2rem] border-border bg-bg-1 px-5 py-3.5 text-inherit no-underline transition-colors duration-150 hover:border-ref"
            style={{ gridTemplateColumns: '1fr auto auto' }}
        >
            <div>
                <div className="mb-0.5 font-bold font-sans text-[0.6rem] text-ref uppercase tracking-[0.22em]">
                    Reference catalog
                </div>
                <div className="font-mono text-[0.85rem] text-fg">
                    <span className="text-ref">{pathLabel}</span>
                    {countSummary && (
                        <>
                            {' '}
                            <span className="text-fg-mute">·</span>{' '}
                            <span className="text-fg-mute">
                                {counts.total} {counts.total === 1 ? 'export' : 'exports'} · {countSummary}
                            </span>
                        </>
                    )}
                </div>
            </div>
            {version && <div className="font-mono text-[0.7rem] text-fg-mute">{version}</div>}
            <div className="font-mono text-ref transition-transform duration-150 group-hover:translate-x-0.75">→</div>
        </Link>
    );
}
