export type BreadcrumbProps = {
    segments: string[];
    /** Truncate middle segments to "…" when there are more than this. */
    maxSegments?: number;
};

export function Breadcrumb({ segments, maxSegments = 5 }: BreadcrumbProps): React.JSX.Element {
    const visible = truncate(segments, maxSegments);
    return (
        <nav aria-label="Breadcrumb" className="breadcrumb">
            <ol style={{ listStyle: 'none', display: 'flex', gap: '0.5rem', padding: 0, margin: 0 }}>
                {visible.map((seg, i) => (
                    <li key={`${i}-${seg}`}>
                        {i > 0 ? (
                            <span aria-hidden="true" style={{ opacity: 0.5 }}>
                                /
                            </span>
                        ) : null}
                        <span>{seg}</span>
                    </li>
                ))}
            </ol>
        </nav>
    );
}

function truncate(segments: string[], max: number): string[] {
    if (segments.length <= max) return segments;
    const keepHead = Math.ceil(max / 2);
    const keepTail = Math.floor(max / 2);
    return [...segments.slice(0, keepHead), '…', ...segments.slice(segments.length - keepTail)];
}
