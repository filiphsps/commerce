'use client';

import { useSelectedLayoutSegments } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Group, Panel, Separator, useDefaultLayout } from 'react-resizable-panels';

import { IconRail, type IconRailItem } from '@/components/shell/icon-rail';
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
    iconRailItems: IconRailItem[];
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
 * @param props.iconRailItems - Navigation items passed through to the IconRail.
 */
export function ShellRoot({ children, subnav, inspector, header, iconRailItems }: ShellRootProps) {
    const breakpoint = useBreakpoint();

    // Detect parallel-route slot activity via Next's router state. The slot
    // prop is an opaque `<LayoutRouter>` from the parent layout's perspective,
    // so we can't walk the rendered tree.
    const subnavSegments = useSelectedLayoutSegments('subnav');
    const inspectorSegments = useSelectedLayoutSegments('inspector');

    const hasSubnav = !!subnavSegments; // TODO
    const hasInspector = !!inspectorSegments; // TODO
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
        <div className="grid h-svh grid-rows-[56px_1fr] overflow-hidden">
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
                        <IconRail items={iconRailItems} expanded={railWidthPx >= RAIL_LABEL_THRESHOLD_PX} />
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
