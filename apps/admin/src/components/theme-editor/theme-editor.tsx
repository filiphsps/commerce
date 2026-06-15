'use client';

import { deriveCatalog, type ThemeGroup, type ThemeTokenMeta } from '@nordcom/commerce-db/lib/theme-catalog';
import { Accordion } from '@nordcom/nordstar';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
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
    sections: 'Sections',
};

/** One navigable cluster: a stable id plus its ordered tokens. */
type ClusterEntry = { id: string; group: ThemeGroup; cluster: string; tokens: ThemeTokenMeta[] };

/** A left-rail section grouping clusters under a display heading. */
type NavSection = { label: string; clusters: ClusterEntry[] };

/**
 * Buckets {@link deriveCatalog} output into ordered left-rail sections by display
 * heading, preserving declaration order. No token name is named here — the shape
 * comes entirely from the catalog.
 *
 * @returns The ordered nav sections.
 */
function buildNavSections(): NavSection[] {
    const sections: NavSection[] = [];
    const byLabel = new Map<string, NavSection>();

    for (const [group, clusters] of deriveCatalog()) {
        const label = GROUP_LABELS[group];
        let section = byLabel.get(label);
        if (!section) {
            section = { label, clusters: [] };
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
 * the `fieldSurface` slot, it renders a left-rail group/cluster nav (generated
 * 100% from `deriveCatalog()`) and the active cluster's controls. The active
 * cluster is deep-linked via the `?cluster=` search param so nav state survives
 * reload. Deprecated (LEGACY) knobs collapse behind an Advanced disclosure;
 * cluster headers carry a knob count and deprecated/forthcoming pills.
 *
 * The live-preview iframe and its desktop/mobile viewport toggle live in the
 * sibling `livePreview` slot ({@link LivePreviewIframe}), colocated with the
 * iframe they control rather than mirrored here.
 *
 * @returns The two-pane theme editor surface.
 */
export function ThemeEditor() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const sections = useMemo(() => buildNavSections(), []);
    const firstClusterId = sections[0]?.clusters[0]?.id;
    const requested = searchParams.get('cluster');
    const allClusters = useMemo(() => sections.flatMap((section) => section.clusters), [sections]);
    const activeId = allClusters.some((entry) => entry.id === requested) ? requested : firstClusterId;
    const active = allClusters.find((entry) => entry.id === activeId);

    const selectCluster = (id: string) => {
        const next = new URLSearchParams(searchParams);
        next.set('cluster', id);
        router.replace(`${pathname}?${next.toString()}` as Route, { scroll: false });
    };

    return (
        <div className="flex min-h-[60vh] gap-4">
            <nav className="w-56 shrink-0 border-border border-r pr-2">
                <Accordion
                    type="multiple"
                    defaultValue={sections.map((section) => section.label)}
                    className="flex flex-col"
                >
                    {sections.map((section) => (
                        <Accordion.Item key={section.label} value={section.label}>
                            <Accordion.Trigger>{section.label}</Accordion.Trigger>
                            <Accordion.Content className="flex flex-col gap-0.5">
                                {section.clusters.map((entry) => (
                                    <ClusterNavButton
                                        key={entry.id}
                                        entry={entry}
                                        active={entry.id === activeId}
                                        onSelect={() => selectCluster(entry.id)}
                                    />
                                ))}
                            </Accordion.Content>
                        </Accordion.Item>
                    ))}
                </Accordion>
            </nav>

            <div className="min-w-0 flex-1">
                {active ? (
                    <ClusterPanel entry={active} />
                ) : (
                    <p className="text-muted-foreground text-sm">No cluster selected.</p>
                )}
            </div>
        </div>
    );
}

/**
 * Left-rail button selecting a cluster, showing its knob count and any
 * deprecated/forthcoming pills.
 *
 * @param props.entry - The cluster this button selects.
 * @param props.active - Whether this cluster is currently shown.
 * @param props.onSelect - Selection handler.
 * @returns The nav button.
 */
function ClusterNavButton({ entry, active, onSelect }: { entry: ClusterEntry; active: boolean; onSelect: () => void }) {
    const hasDeprecated = entry.tokens.some((token) => token.deprecated);
    const hasForthcoming = entry.tokens.some((token) => token.forthcoming);

    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                'flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/60',
            )}
        >
            <span className="capitalize">{humanizeKey(entry.cluster)}</span>
            <span className="flex items-center gap-1">
                {hasDeprecated ? <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> : null}
                {hasForthcoming ? <span className="h-1.5 w-1.5 rounded-full bg-primary/60" /> : null}
                <span className="text-muted-foreground text-xs">{entry.tokens.length}</span>
            </span>
        </button>
    );
}

/**
 * Right-pane panel for the active cluster: a header with the knob count and
 * status pills, the accent repeater for `accents[]` array rows (when present),
 * the active leaf controls, and the LEGACY (deprecated) controls behind an
 * Advanced disclosure.
 *
 * @param props.entry - The active cluster.
 * @returns The cluster panel.
 */
function ClusterPanel({ entry }: { entry: ClusterEntry }) {
    const accentTokens = entry.tokens.filter(isAccentRepeaterToken);
    const leafTokens = entry.tokens.filter((token) => !isAccentRepeaterToken(token));
    const active = leafTokens.filter((token) => !token.deprecated);
    const legacy = leafTokens.filter((token) => token.deprecated);
    const forthcomingCount = entry.tokens.filter((token) => token.forthcoming).length;

    return (
        <section className="flex flex-col">
            <header className="mb-2 flex items-center gap-2 border-border border-b pb-2">
                <h2 className="font-bold text-foreground text-lg capitalize">{humanizeKey(entry.cluster)}</h2>
                <span className="text-muted-foreground text-sm">{entry.tokens.length} knobs</span>
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
