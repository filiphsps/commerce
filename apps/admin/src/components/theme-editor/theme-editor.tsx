'use client';

import { deriveCatalog, type ThemeGroup, type ThemeTokenMeta } from '@nordcom/commerce-db/lib/theme-catalog';
import { Accordion } from '@nordcom/nordstar';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type KeyboardEvent, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/tailwind';
import { AccentRepeater } from './accent-repeater';
import { isAccentRepeaterToken } from './control-registry';
import { humanizeKey } from './controls/field-row';
import { TokenControl } from './token-control';

/** Display heading for each catalog group; radii/spacing/elevation fold into one "Layout" section. */
const GROUP_LABELS: Record<ThemeGroup, string> = {
    colors: 'Colors',
    typography: 'Typography',
    radii: 'Layout',
    spacing: 'Layout',
    elevation: 'Layout',
    productCard: 'Product Card',
    cartLine: 'Cart Line',
    sections: 'Sections',
};

/** One cluster of tokens within a section. */
type ClusterEntry = { id: string; group: ThemeGroup; cluster: string; tokens: ThemeTokenMeta[] };

/** A top-level theme section, surfaced as one tab. */
type NavSection = { label: string; slug: string; clusters: ClusterEntry[] };

/**
 * URL/id-safe slug for a section label (`Product Card` → `product-card`), used
 * for the tab/panel ids and the `?group=` deep link.
 *
 * @param label - The section display label.
 * @returns The slug.
 */
function slugify(label: string): string {
    return label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

/**
 * Buckets {@link deriveCatalog} output into ordered sections by display heading,
 * preserving declaration order. No token name is named here — the shape comes
 * entirely from the catalog.
 *
 * @returns The ordered sections.
 */
function buildNavSections(): NavSection[] {
    const sections: NavSection[] = [];
    const byLabel = new Map<string, NavSection>();

    for (const [group, clusters] of deriveCatalog()) {
        const label = GROUP_LABELS[group];
        let section = byLabel.get(label);
        if (!section) {
            section = { label, slug: slugify(label), clusters: [] };
            byLabel.set(label, section);
            sections.push(section);
        }
        for (const [cluster, tokens] of clusters) {
            section.clusters.push({ id: `${group}/${cluster}`, group, cluster, tokens });
        }
    }

    return sections;
}

/**
 * Catalog-driven Theme Editor field surface. Mounted inside the editor `<Form>` as
 * the `fieldSurface` slot, it renders a horizontal section tablist (generated 100%
 * from `deriveCatalog()`) over a panel listing every cluster in the active section.
 * The active section is deep-linked via the `?group=` search param so nav state
 * survives reload.
 *
 * The tablist follows the WAI-ARIA tabs pattern: roving `tabIndex`, `aria-selected`,
 * `aria-controls`, and arrow/Home/End keyboard navigation with selection following
 * focus. The live-preview iframe and its viewport toggle live in the sibling
 * `livePreview` slot ({@link LivePreviewIframe}), colocated with the iframe they
 * control rather than mirrored here.
 *
 * @returns The tabbed theme editor surface.
 */
export function ThemeEditor() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const sections = useMemo(() => buildNavSections(), []);
    const requested = searchParams.get('group');
    const requestedIndex = sections.findIndex((section) => section.slug === requested);
    const activeIndex = requestedIndex === -1 ? 0 : requestedIndex;
    const active = sections[activeIndex];
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const [query, setQuery] = useState('');
    const q = query.trim().toLowerCase();
    const visibleClusters = active
        ? active.clusters
              .map((entry) => ({
                  ...entry,
                  tokens: q
                      ? entry.tokens.filter((token) => {
                            const leafKey = token.path.split('.').pop() ?? token.path;
                            return (
                                humanizeKey(leafKey).toLowerCase().includes(q) ||
                                humanizeKey(entry.cluster).toLowerCase().includes(q)
                            );
                        })
                      : entry.tokens,
              }))
              .filter((entry) => entry.tokens.length > 0)
        : [];

    const selectGroup = (slug: string) => {
        const next = new URLSearchParams(searchParams);
        next.set('group', slug);
        router.replace(`${pathname}?${next.toString()}` as Route, { scroll: false });
    };

    const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        const last = sections.length - 1;
        let nextIndex: number | null = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = index === last ? 0 : index + 1;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = index === 0 ? last : index - 1;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = last;
        if (nextIndex === null) return;

        const target = sections[nextIndex];
        if (!target) return;
        event.preventDefault();
        tabRefs.current[nextIndex]?.focus();
        selectGroup(target.slug);
    };

    return (
        <div className="flex min-h-[60vh] flex-col gap-4">
            <Input
                type="search"
                aria-label="Search theme settings"
                placeholder={active ? `Search ${active.label}…` : 'Search settings…'}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="max-w-xs"
            />
            <div
                role="tablist"
                aria-label="Theme sections"
                aria-orientation="horizontal"
                className="flex flex-wrap gap-1 border-border border-b"
            >
                {sections.map((section, index) => {
                    const selected = index === activeIndex;
                    return (
                        <button
                            key={section.slug}
                            ref={(node) => {
                                tabRefs.current[index] = node;
                            }}
                            type="button"
                            role="tab"
                            id={`theme-tab-${section.slug}`}
                            aria-selected={selected}
                            aria-controls={`theme-panel-${section.slug}`}
                            tabIndex={selected ? 0 : -1}
                            onClick={() => selectGroup(section.slug)}
                            onKeyDown={(event) => onTabKeyDown(event, index)}
                            className={cn(
                                '-mb-px cursor-pointer border-b-2 px-3 py-2 font-bold text-sm uppercase tracking-wide transition-colors',
                                selected
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {section.label}
                        </button>
                    );
                })}
            </div>

            {active ? (
                <div
                    role="tabpanel"
                    id={`theme-panel-${active.slug}`}
                    aria-labelledby={`theme-tab-${active.slug}`}
                    tabIndex={0}
                    className="flex min-w-0 flex-col gap-6 outline-none"
                >
                    {visibleClusters.length > 0 ? (
                        visibleClusters.map((entry) => <ClusterSection key={entry.id} entry={entry} />)
                    ) : (
                        <p className="text-muted-foreground text-sm">No settings match your search.</p>
                    )}
                </div>
            ) : (
                <p className="text-muted-foreground text-sm">No theme sections available.</p>
            )}
        </div>
    );
}

/**
 * One cluster rendered as a labelled sub-section inside the active tab panel: a
 * heading with deprecated/forthcoming badges, the accent repeater for `accents[]`
 * array rows (when present), the active leaf controls, and the LEGACY (deprecated)
 * controls behind an Advanced disclosure.
 *
 * @param props.entry - The cluster to render.
 * @returns The cluster section.
 */
function ClusterSection({ entry }: { entry: ClusterEntry }) {
    const accentTokens = entry.tokens.filter(isAccentRepeaterToken);
    const leafTokens = entry.tokens.filter((token) => !isAccentRepeaterToken(token));
    const active = leafTokens.filter((token) => !token.deprecated);
    const legacy = leafTokens.filter((token) => token.deprecated);
    const forthcomingCount = entry.tokens.filter((token) => token.forthcoming).length;
    const headingId = `theme-cluster-${slugify(entry.id)}`;

    return (
        <section aria-labelledby={headingId} className="flex flex-col">
            <header className="mb-2 flex items-center gap-2 border-border border-b pb-2">
                <h3 id={headingId} className="font-bold text-base text-foreground capitalize">
                    {humanizeKey(entry.cluster)}
                </h3>
                {legacy.length > 0 ? <Badge>{legacy.length} legacy</Badge> : null}
                {forthcomingCount > 0 ? <Badge>{forthcomingCount} forthcoming</Badge> : null}
            </header>

            {accentTokens.length > 0 ? (
                <div className="py-2">
                    <AccentRepeater tokens={accentTokens} />
                </div>
            ) : null}

            <div className="flex flex-col divide-y divide-border">
                {active.map((token) => (
                    <TokenControl key={token.path} token={token} />
                ))}
            </div>

            {legacy.length > 0 ? (
                <Accordion type="single" collapsible className="mt-2 border-border border-t">
                    <Accordion.Item value="advanced">
                        <Accordion.Trigger>Advanced ({legacy.length} legacy)</Accordion.Trigger>
                        <Accordion.Content className="flex flex-col divide-y divide-border">
                            {legacy.map((token) => (
                                <TokenControl key={token.path} token={token} />
                            ))}
                        </Accordion.Content>
                    </Accordion.Item>
                </Accordion>
            ) : null}
        </section>
    );
}
