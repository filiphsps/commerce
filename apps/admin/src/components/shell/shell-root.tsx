'use client';

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
    type ImperativePanelGroupHandle,
    type ImperativePanelHandle,
    Panel,
    PanelGroup,
    PanelResizeHandle,
} from 'react-resizable-panels';

import { IconRail, type IconRailItem } from '@/components/shell/icon-rail';
import { InspectorSlot } from '@/components/shell/inspector-slot';
import { SHELL_STATE_COOKIE, type ShellState, serializeShellState } from '@/components/shell/shell-state';
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
    hasSubnav: boolean;
    hasInspector: boolean;
    initialState: ShellState;
    iconRailItems: IconRailItem[];
};

const RAIL_MIN_PX = 82;
const RAIL_LABEL_THRESHOLD_PX = 160;
const RAIL_MAX_PX = 280;
const SUBNAV_MIN_PX = 200;
const SUBNAV_MAX_PX = 480;
const INSPECTOR_MIN_PX = 240;
const INSPECTOR_MAX_PX = 560;

function pxToPercent(px: number, totalPx: number): number {
    if (totalPx <= 0) return 10;
    return Math.max(0, Math.min(100, (px / totalPx) * 100));
}

function writeShellStateCookie(state: ShellState): void {
    document.cookie = `${SHELL_STATE_COOKIE}=${serializeShellState(state)}; max-age=31536000; path=/; samesite=lax`;
}

export function ShellRoot({
    children,
    subnav,
    inspector,
    header,
    hasSubnav,
    hasInspector,
    initialState,
    iconRailItems,
}: ShellRootProps) {
    const breakpoint = useBreakpoint();
    const groupRef = useRef<ImperativePanelGroupHandle | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const railRef = useRef<ImperativePanelHandle | null>(null);
    const subnavRef = useRef<ImperativePanelHandle | null>(null);
    const inspectorRef = useRef<ImperativePanelHandle | null>(null);

    const [state, setState] = useState<ShellState>(initialState);
    // Mirror `state` in a ref so the resize/write callbacks can read the latest
    // value without listing `state` in their deps — listing it churns the
    // callback identity on every layout change, which feeds PanelGroup a new
    // `onLayout` reference and is the kind of nudge react-resizable-panels
    // needs to fire onLayout again. Keep handlers stable; read via ref.
    const stateRef = useRef<ShellState>(initialState);

    const writeTimer = useRef<number | null>(null);
    const scheduleWrite = useCallback(() => {
        if (writeTimer.current !== null) window.clearTimeout(writeTimer.current);
        writeTimer.current = window.setTimeout(() => writeShellStateCookie(stateRef.current), 250);
    }, []);

    // Use a deterministic reference width for SSR/initial render so server-rendered
    // panel sizes match the client's first paint. Panel components remeasure the
    // actual container after mount, so this only affects the very first frame.
    const SSR_REFERENCE_WIDTH = 1440;

    const railDefaultPct = pxToPercent(initialState.rail.w, SSR_REFERENCE_WIDTH);
    const subnavDefaultPct = pxToPercent(initialState.subnav.w, SSR_REFERENCE_WIDTH);
    const inspectorDefaultPct = pxToPercent(initialState.inspector.w, SSR_REFERENCE_WIDTH);
    const contentDefaultPct = Math.max(20, 100 - railDefaultPct - subnavDefaultPct - inspectorDefaultPct);

    const onLayoutChange = useCallback(
        (sizes: number[]) => {
            const total = containerRef.current?.getBoundingClientRect().width ?? SSR_REFERENCE_WIDTH;
            if (total <= 0) return;

            const railPct = sizes[0] ?? railDefaultPct;
            const subnavPct = sizes[1] ?? subnavDefaultPct;
            const inspectorPct = sizes[sizes.length - 1] ?? inspectorDefaultPct;
            setState((prev) => {
                const next: ShellState = {
                    rail: { w: Math.round((railPct / 100) * total), collapsed: prev.rail.collapsed },
                    subnav: { w: Math.round((subnavPct / 100) * total), collapsed: prev.subnav.collapsed },
                    inspector: {
                        w: Math.round((inspectorPct / 100) * total),
                        collapsed: prev.inspector.collapsed,
                    },
                };
                stateRef.current = next;
                return next;
            });
            scheduleWrite();
        },
        [railDefaultPct, subnavDefaultPct, inspectorDefaultPct, scheduleWrite],
    );

    // Flush any pending cookie write on unmount so a fast route change after a
    // resize doesn't lose the last layout.
    useEffect(
        () => () => {
            if (writeTimer.current !== null) {
                window.clearTimeout(writeTimer.current);
                writeShellStateCookie(stateRef.current);
            }
        },
        [],
    );

    return (
        <div ref={containerRef} className="grid h-svh grid-rows-[56px_1fr] overflow-hidden">
            {header}
            {breakpoint === 'mobile' || breakpoint === 'tablet' ? (
                <main className="relative min-w-0 overflow-hidden">{children}</main>
            ) : (
                <PanelGroup ref={groupRef} direction="horizontal" onLayout={onLayoutChange}>
                    <Panel
                        ref={railRef}
                        id="rail"
                        order={1}
                        defaultSize={railDefaultPct}
                        minSize={pxToPercent(RAIL_MIN_PX, SSR_REFERENCE_WIDTH)}
                        maxSize={pxToPercent(RAIL_MAX_PX, SSR_REFERENCE_WIDTH)}
                        collapsible={true}
                        collapsedSize={pxToPercent(RAIL_MIN_PX, SSR_REFERENCE_WIDTH)}
                    >
                        <IconRail items={iconRailItems} expanded={state.rail.w >= RAIL_LABEL_THRESHOLD_PX} />
                    </Panel>

                    {hasSubnav ? (
                        <>
                            <PanelResizeHandle className="w-px bg-border transition-colors hover:bg-primary/50 data-[resize-handle-state=drag]:bg-primary" />
                            <Panel
                                ref={subnavRef}
                                id="subnav"
                                order={2}
                                defaultSize={subnavDefaultPct}
                                minSize={pxToPercent(SUBNAV_MIN_PX, SSR_REFERENCE_WIDTH)}
                                maxSize={pxToPercent(SUBNAV_MAX_PX, SSR_REFERENCE_WIDTH)}
                                collapsible
                                collapsedSize={0}
                            >
                                <SubNavSlot>{subnav}</SubNavSlot>
                            </Panel>
                        </>
                    ) : null}

                    <PanelResizeHandle className="w-px bg-border transition-colors hover:bg-primary/50 data-[resize-handle-state=drag]:bg-primary" />
                    <Panel id="content" order={3} defaultSize={contentDefaultPct} minSize={20} collapsible={false}>
                        <main className="relative h-full min-w-0 overflow-hidden">{children}</main>
                    </Panel>

                    {hasInspector && (breakpoint === 'wide' || breakpoint === 'comfortable') ? (
                        <>
                            <PanelResizeHandle className="w-px bg-border transition-colors hover:bg-primary/50 data-[resize-handle-state=drag]:bg-primary" />
                            <Panel
                                ref={inspectorRef}
                                id="inspector"
                                order={4}
                                defaultSize={inspectorDefaultPct}
                                minSize={pxToPercent(INSPECTOR_MIN_PX, SSR_REFERENCE_WIDTH)}
                                maxSize={pxToPercent(INSPECTOR_MAX_PX, SSR_REFERENCE_WIDTH)}
                                collapsible
                                collapsedSize={0}
                            >
                                <InspectorSlot>{inspector}</InspectorSlot>
                            </Panel>
                        </>
                    ) : null}
                </PanelGroup>
            )}
        </div>
    );
}
