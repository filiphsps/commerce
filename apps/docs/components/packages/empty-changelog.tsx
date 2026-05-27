type EmptyChangelogProps = {
    /** Package name (e.g. `@nordcom/commerce-cms`) for the eyebrow. */
    pkg: string;
    /** GitHub commit log URL for the "View commit log" CTA. */
    commitLogUrl: string;
};

/**
 * Empty-state card rendered on package changelog pages when no CHANGELOG.md
 * exists yet. Uses a neutral grey "v0" icon (not alarming — the package simply
 * hasn't shipped a changeset yet). Matches the `.empty-card` pattern in
 * visuals/09-empty-states.html.
 *
 * @param props - Package name and commit log URL.
 * @returns The no-releases-yet empty state card.
 */
export function EmptyChangelog({ pkg, commitLogUrl }: EmptyChangelogProps) {
    const slug = pkg.replace('@nordcom/commerce-', '');
    return (
        <div className="not-prose my-8 grid max-w-[920px] place-items-start gap-5 rounded-[0.45rem] border-[0.2rem] border-border bg-[radial-gradient(ellipse_at_center_top,var(--color-bg-1)_30%,var(--color-bg))] p-10">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-fg-mute">
                Packages · {pkg} · Changelog
            </p>

            <div className="flex h-14 w-14 items-center justify-center rounded-full border-[0.2rem] border-border-strong font-mono text-xl text-fg-dim">
                v0
            </div>

            <p className="font-display text-[1.7rem] font-extrabold leading-[1.15] tracking-[-0.025em] text-fg">
                No releases yet
            </p>

            <p className="max-w-[55ch] text-[0.95rem] font-medium leading-[1.6] text-fg-mute">
                This package is unreleased. Once the first{' '}
                <code className="rounded-[3px] bg-bg-2 px-[0.3em] font-mono text-[0.85em] text-fg">changeset</code>{' '}
                ships, this page will mirror{' '}
                <code className="rounded-[3px] bg-bg-2 px-[0.3em] font-mono text-[0.85em] text-fg">
                    packages/{slug}/CHANGELOG.md
                </code>{' '}
                automatically. For now, follow the package&apos;s commit history.
            </p>

            <div className="flex flex-wrap gap-2.5">
                <a
                    href={commitLogUrl}
                    className="inline-flex items-center gap-1.5 rounded-[0.3rem] border-[0.138rem] border-border-strong px-4 py-2.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.14em] text-fg no-underline transition-all hover:border-brand hover:bg-brand/10 hover:text-brand"
                >
                    View commit log ↗
                </a>
                <a
                    href="https://github.com/changesets/changesets"
                    className="inline-flex items-center gap-1.5 rounded-[0.3rem] border-[0.138rem] border-border-strong px-4 py-2.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.14em] text-fg no-underline transition-all hover:border-brand hover:bg-brand/10 hover:text-brand"
                >
                    How changesets work
                </a>
            </div>
        </div>
    );
}
