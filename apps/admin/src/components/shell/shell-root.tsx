'use client';

import { useSelectedLayoutSegments } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Group, Panel, Separator, useDefaultLayout } from 'react-resizable-panels';

import { IconRail, type IconRailGroup } from '@/components/shell/icon-rail';
import { InspectorSlot } from '@/components/shell/inspector-slot';
import { SubNavSlot } from '@/components/shell/sub-nav-slot';
import { useBreakpoint } from '@/components/shell/use-breakpoint';

export type ShellRootProps = {
    /** Page content. */
    children: ReactNode;
    /** Server-resolved @subnav slot. */
    subnav: ReactNode;
    /** Server-resolved @inspector slot. */
    inspector: ReactNode;
    /** Pre-rendered header (server component). */
    header: ReactNode;
    iconRailGroups: IconRailGroup[];
};

const RAIL_MIN_PX = 82;
const RAIL_LABEL_THRESHOLD_PX = 160;
const RAIL_MAX_PX = 280;
const SUBNAV_MIN_PX = 200;
const SUBNAV_MAX_PX = 480;
const INSPECTOR_MIN_PX = 240;
const INSPECTOR_MAX_PX = 560;

const SEPARATOR_CLASSNAME =
    "w-[0.2rem] bg-border transition-colors data-[separator='hover']:bg-foreground-highlight/50 data-[separator='active']:bg-foreground";

export const SHELL_ROOT_ID = 'shell-root';

// The placeholder segment Next.js pushes into `useSelectedLayoutSegments(slot)` when a
// parallel slot renders its `default.tsx`. Next's `getSelectedLayoutSegmentPath` strips
// only the trailing `__PAGE__` leaf, NOT this one, so it always rides along (see
// `next/dist/shared/lib/segment`). Mirrored locally rather than imported from Next internals.
const DEFAULT_SLOT_SEGMENT = '__DEFAULT__';

/**
 * Decides whether a parallel-route slot is genuinely showing a section, given the segments
 * `useSelectedLayoutSegments(slot)` returned.
 *
 * Our `@subnav`/`@inspector` slots are default-only: the root `default.tsx` (which renders
 * nothing) yields `['__DEFAULT__']`, while a matched section yields e.g.
 * `['settings', '__DEFAULT__']`. The slot is therefore active only when some segment is a real
 * section — i.e. not the `__DEFAULT__` placeholder. A bare `!!segments` test is wrong because
 * the array is always truthy (even `['__DEFAULT__']`), which would mount an empty panel on every
 * route.
 *
 * @param segments - The slot segments from `useSelectedLayoutSegments`, or `null` outside app router.
 * @returns `true` when the slot matched a real section, `false` for the default-only/empty case.
 */
export function isSlotActive(segments: string[] | null): boolean {
    return Array.isArray(segments) && segments.some((segment) => segment !== DEFAULT_SLOT_SEGMENT);
}

/**
 * Resizable panel layout for the admin shell, adapting between mobile (single-column) and desktop (multi-panel) views.
 *
 * Manages panel widths via react-resizable-panels, detects parallel-route slot activity to show/hide
 * the subnav and inspector panels, and observes the rail width to toggle icon-only vs labeled mode.
 *
 * @param props.children - Main page content rendered in the center panel.
 * @param props.subnav - Server-resolved @subnav parallel-route slot.
 * @param props.inspector - Server-resolved @inspector parallel-route slot.
 * @param props.header - Pre-rendered header server component.
 * @param props.iconRailGroups - Grouped navigation sections passed through to the IconRail.
 */
export function ShellRoot({ children, subnav, inspector, header, iconRailGroups }: ShellRootProps) {
    const breakpoint = useBreakpoint();

    // Detect parallel-route slot activity via Next's router state. The slot
    // prop is an opaque `<LayoutRouter>` from the parent layout's perspective,
    // so we can't walk the rendered tree.
    const subnavSegments = useSelectedLayoutSegments('subnav');
    const inspectorSegments = useSelectedLayoutSegments('inspector');

    const hasSubnav = isSlotActive(subnavSegments);
    const hasInspector = isSlotActive(inspectorSegments);
    const showInspector = hasInspector && (breakpoint === 'wide' || breakpoint === 'comfortable');

    // `panelIds` must reflect the panels that will actually mount; a mismatch
    // makes useDefaultLayout apply the saved layout to the wrong ids and
    // produces visible shift.
    const panelIds = useMemo(() => {
        return [
            'rail',
            ...(hasSubnav ? ['subnav'] : []),
            'content',
            ...(showInspector ? ['inspector'] : []),
            //
        ];
    }, [showInspector, hasSubnav]);

    const { defaultLayout, onLayoutChanged } = useDefaultLayout({
        id: SHELL_ROOT_ID,
        panelIds,
        storage: {
            getItem: () => null,
            setItem: () => {},
        },
    });

    // The icon rail swaps between icon-only and labeled modes based on its
    // rendered pixel width. We can't derive that from the layout percentage
    // alone (container width is unknown until mount), so observe the rail
    // element directly — this also keeps labels reactive during a drag.
    const railElementRef = useRef<HTMLDivElement | null>(null);
    const [railWidthPx, setRailWidthPx] = useState<number>(0);
    useEffect(() => {
        const el = railElementRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) setRailWidthPx(Math.round(entry.contentRect.width));
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return (
        // `grid-cols-[minmax(0,1fr)]` caps the single column at the viewport width.
        // Without it the implicit `auto` column grows to the content's max-content,
        // so a wide-but-wrappable child (e.g. an unconstrained `flex-wrap` row) can
        // push <main> past the viewport — clipped by `overflow-hidden`, but still a
        // real horizontal overflow on phones/foldables.
        <div className="grid h-svh grid-cols-[minmax(0,1fr)] grid-rows-[56px_1fr] overflow-hidden">
            {header}
            {breakpoint === 'mobile' || breakpoint === 'tablet' ? (
                <main className="relative min-w-0 overflow-hidden">{children}</main>
            ) : (
                <Group
                    id="shell"
                    orientation="horizontal"
                    defaultLayout={defaultLayout}
                    onLayoutChanged={onLayoutChanged}
                >
                    <Panel
                        id="rail"
                        elementRef={railElementRef}
                        minSize={RAIL_MIN_PX}
                        maxSize={RAIL_MAX_PX}
                        collapsible
                        collapsedSize={RAIL_MIN_PX}
                        groupResizeBehavior="preserve-pixel-size"
                    >
                        <IconRail groups={iconRailGroups} expanded={railWidthPx >= RAIL_LABEL_THRESHOLD_PX} />
                    </Panel>

                    {hasSubnav ? (
                        <>
                            <Separator className={SEPARATOR_CLASSNAME} />
                            <Panel
                                id="subnav"
                                minSize={SUBNAV_MIN_PX}
                                maxSize={SUBNAV_MAX_PX}
                                collapsible
                                collapsedSize={0}
                                groupResizeBehavior="preserve-pixel-size"
                            >
                                <SubNavSlot>{subnav}</SubNavSlot>
                            </Panel>
                        </>
                    ) : null}

                    <Separator className={SEPARATOR_CLASSNAME} />
                    <Panel id="content" minSize="70%" collapsible={false} groupResizeBehavior="preserve-relative-size">
                        <main className="relative h-full min-w-0 overflow-hidden px-3">{children}</main>
                    </Panel>

                    {showInspector ? (
                        <>
                            <Separator className={SEPARATOR_CLASSNAME} />
                            <Panel
                                id="inspector"
                                minSize={INSPECTOR_MIN_PX}
                                maxSize={INSPECTOR_MAX_PX}
                                collapsible
                                collapsedSize={0}
                                groupResizeBehavior="preserve-pixel-size"
                            >
                                <InspectorSlot>{inspector}</InspectorSlot>
                            </Panel>
                        </>
                    ) : null}
                </Group>
            )}
        </div>
    );
}
